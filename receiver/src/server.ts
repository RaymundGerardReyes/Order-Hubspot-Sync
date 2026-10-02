import fastify, { FastifyInstance } from 'fastify';
import crypto from 'node:crypto';
import { ReceiverConfig } from './config';
import { forwardOrder } from './forward';
import { verifySignature } from './hmac';
import { OrderPayloadSchema } from './schema';

export interface ServerOptions {
  config: ReceiverConfig;
}

export function buildServer(options: ServerOptions): FastifyInstance {
  const app = fastify({
    logger: true,
  });

  // Preserve raw body for accurate HMAC signature computation
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      done(null, body);
    }
  );

  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  app.post('/webhooks/orders', async (request, reply) => {
    const rawBuffer = request.body as Buffer;
    if (!rawBuffer) {
      return reply.status(400).send({ error: 'Empty payload body' });
    }

    const rawString = rawBuffer.toString('utf8');
    const signature = request.headers['x-signature'] as string | undefined;

    // 1. Verify HMAC Signature
    const verification = verifySignature(rawString, signature, options.config.webhookSecret);
    if (!verification.isValid) {
      request.log.warn({ reason: verification.reason }, 'HMAC signature verification failed');
      return reply.status(401).send({
        error: 'Unauthorized',
        message: verification.reason || 'Invalid signature',
      });
    }

    // 2. Validate JSON structure
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawString);
    } catch {
      return reply.status(400).send({ error: 'Malformed JSON payload' });
    }

    // 3. Schema validation with Zod
    const validationResult = OrderPayloadSchema.safeParse(parsedJson);
    if (!validationResult.success) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        issues: validationResult.error.issues,
      });
    }

    // 4. Forward to Laravel Backend
    const requestId = (request.headers['x-request-id'] as string) || crypto.randomUUID();
    try {
      const forwardResult = await forwardOrder(
        options.config.backendUrl,
        options.config.internalToken,
        validationResult.data,
        requestId
      );

      return reply.status(forwardResult.statusCode).send(forwardResult.data);
    } catch (err: unknown) {
      request.log.error(err, 'Failed to forward payload to backend');
      return reply.status(502).send({
        error: 'Bad Gateway',
        message: 'Failed to communicate with internal backend service.',
      });
    }
  });

  return app;
}
