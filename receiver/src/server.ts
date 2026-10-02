import fastify, { FastifyInstance } from 'fastify';
import type { ApiConfig } from './config.js';
import { verifySignature } from './hmac.js';
import { OrderPayloadSchema } from './schema.js';
import { orderRepo, attemptRepo } from './db/repositories.js';
import { HubSpotClient } from './hubspot/client.js';
import { HubSpotRepository } from './hubspot/repository.js';
import { SyncService } from './domain/sync.service.js';
import { runMigrations } from './db/migrations.js';
import { getDb } from './db/connection.js';

export interface ServerOptions {
  config: ApiConfig;
}

export function buildServer(options: ServerOptions): FastifyInstance {
  const { config } = options;
  const app = fastify({ logger: true });

  // Run SQLite migrations on startup
  runMigrations();

  // Build HubSpot service graph
  const hubspotClient = new HubSpotClient({
    accessToken: config.hubspotAccessToken,
    timeoutMs: config.hubspotRequestTimeoutMs,
    maxAttempts: config.hubspotMaxAttempts,
  });
  const hubspotRepo = new HubSpotRepository(
    hubspotClient,
    config.hubspotPipelineId,
    config.hubspotDealStageId,
    config.hubspotOrderIdProperty
  );
  const syncService = new SyncService(hubspotRepo);

  // ─── Preserve raw body for accurate HMAC computation (Req 22) ────────────
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (_req, body, done) => { done(null, body); }
  );

  // ─── GET /health and /healthz ────────────────────────────────────────────
  const healthHandler = async () => {
    try {
      const db = getDb();
      db.prepare('SELECT 1').get();
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch {
      return app.httpErrors?.serviceUnavailable?.() ??
        { status: 'unhealthy', timestamp: new Date().toISOString() };
    }
  };
  app.get('/health', healthHandler);
  app.get('/healthz', healthHandler);
  app.get('/api/health', healthHandler);
  app.get('/api/healthz', healthHandler);

  // ─── POST /webhooks/orders (Req 22 + 23 + 24 + 25 + 26) ─────────────────
  app.post('/webhooks/orders', async (request, reply) => {
    const rawBuffer = request.body as Buffer;
    if (!rawBuffer || rawBuffer.length === 0) {
      return reply.status(400).send({ error: 'Empty payload body' });
    }

    // 1. Verify HMAC-SHA256 signature against raw bytes (Req 22)
    const rawString = rawBuffer.toString('utf8');
    const sigHeader = (
      request.headers['x-webhook-signature'] ?? request.headers['x-signature']
    ) as string | undefined;

    const verification = verifySignature(rawString, sigHeader, config.webhookSecret);
    if (!verification.isValid) {
      request.log.warn({ reason: verification.reason }, 'HMAC signature verification failed');
      return reply.status(401).send({
        error: 'Unauthorized',
        message: verification.reason || 'Invalid or missing signature',
      });
    }

    // 2. Parse JSON (after verifying against raw bytes)
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawString);
    } catch {
      return reply.status(400).send({ error: 'Malformed JSON payload' });
    }

    // 3. Schema validation
    const validation = OrderPayloadSchema.safeParse(parsedJson);
    if (!validation.success) {
      return reply.status(422).send({
        error: 'Unprocessable Entity',
        issues: validation.error.issues,
      });
    }

    const payload = validation.data;

    // 4. Idempotency: try to insert order row atomically (PRIMARY KEY guard)
    let orderRow = orderRepo.insertIfNew(payload);

    if (orderRow === null) {
      // Duplicate — read existing state
      const existingOrder = orderRepo.findById(payload.order_id);
      const latestAttempt = attemptRepo.latestForOrder(payload.order_id);

      const currentStatus = latestAttempt?.status ?? existingOrder?.status;

      if (currentStatus === 'pending' || currentStatus === 'processing') {
        // Already in-flight — do not enqueue a second sync
        return reply.status(200).send({
          duplicate: true,
          status: 'in_progress',
          message: `Order ${payload.order_id} is already being processed.`,
          orderId: payload.order_id,
          attemptId: latestAttempt?.id,
        });
      }

      // Succeeded or failed — return existing canonical state
      return reply.status(200).send({
        duplicate: true,
        status: currentStatus ?? 'unknown',
        message: `Order ${payload.order_id} already known.`,
        orderId: payload.order_id,
        hubspotContactId: existingOrder?.hubspot_contact_id,
        hubspotDealId: existingOrder?.hubspot_deal_id,
        attemptId: latestAttempt?.id,
      });
    }

    // 5. New order: insert pending attempt
    let attempt: ReturnType<typeof attemptRepo.insert>;
    try {
      attempt = attemptRepo.insert(payload.order_id, 'webhook');
    } catch (err) {
      request.log.error(err, 'Failed to insert sync attempt — storage unavailable');
      return reply.status(503).send({
        error: 'Service Unavailable',
        message: 'Storage unavailable, please retry later.',
      });
    }

    // 6. 202 Accepted — respond immediately, then sync asynchronously
    reply.status(202).send({
      status: 'accepted',
      message: 'Order accepted for processing.',
      orderId: payload.order_id,
      attemptId: attempt.id,
    });

    // 7. Fire-and-forget sync (in-process worker)
    setImmediate(() => {
      syncService.syncAttempt(attempt.id, payload).catch((err) => {
        request.log.error(err, `Sync failed for order ${payload.order_id}`);
      });
    });
  });

  // ─── GET /api/sync-attempts (Req 27 dashboard) ───────────────────────────
  const listSyncsHandler = async (request: any, reply: any) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(parseInt(query.limit ?? '50', 10), 200);

    const rows = attemptRepo.listRecent(limit);

    const records = rows.map((row) => {
      const orderPayload = (() => {
        try { return JSON.parse(row.payload_json); } catch { return {}; }
      })();
      const canRetry = row.status === 'failed';

      return {
        // Analysis doc contract format
        attempt_id: row.id,
        order_id: row.order_id,
        trigger: row.trigger,
        customer_email: orderPayload?.customer?.email ?? null,
        total: orderPayload?.total ?? null,
        currency: orderPayload?.currency ?? null,
        status: row.status,
        hubspot_contact_id: row.hubspot_contact_id,
        hubspot_deal_id: row.hubspot_deal_id,
        error: row.error_message,
        error_code: row.error_code,
        started_at: row.started_at,
        finished_at: row.finished_at,
        created_at: row.created_at,
        can_retry: canRetry,

        // Dual-casing aliases for TypeScript UI compatibility
        id: String(row.id),
        orderId: row.order_id,
        hubspotDealId: row.hubspot_deal_id,
        hubspotContactId: row.hubspot_contact_id,
        retryOf: null,
        attemptNumber: row.retry_count + 1,
        failureCode: row.error_code,
        failureMessage: row.error_message,
        startedAt: row.started_at,
        completedAt: row.finished_at,
        createdAt: row.created_at,
      };
    });

    return reply.send({ data: records, total: records.length });
  };

  app.get('/api/sync-attempts', listSyncsHandler);
  app.get('/api/syncs', listSyncsHandler);
  app.get('/sync-attempts', listSyncsHandler);
  app.get('/syncs', listSyncsHandler);

  // ─── POST Retry Handler (Req 27 — analysis doc §Manual retry) ───────────
  const retryHandler = async (request: any, reply: any) => {
    const params = request.params as { orderId?: string; id?: string };
    let orderId = params.orderId || params.id;

    if (!orderId) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Order or attempt identifier required' });
    }

    // If identifier is an attempt ID (number or non-existent order), resolve to order_id
    let order = orderRepo.findById(orderId);
    if (!order) {
      const attemptNum = parseInt(orderId, 10);
      if (!isNaN(attemptNum)) {
        const attempt = attemptRepo.findById(attemptNum);
        if (attempt) {
          orderId = attempt.order_id;
          order = orderRepo.findById(orderId);
        }
      }
    }

    if (!order) {
      return reply.status(404).send({ error: 'Not Found', message: `Order ${orderId} not found.` });
    }

    const latestAttempt = attemptRepo.latestForOrder(orderId);
    const latestStatus = latestAttempt?.status;

    // Reject retry if pending or processing (already in flight)
    if (latestStatus === 'pending' || latestStatus === 'processing') {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Order ${orderId} already has an attempt in progress.`,
      });
    }

    // Reject retry if already succeeded
    if (order.status === 'succeeded') {
      return reply.status(409).send({
        error: 'Conflict',
        message: `Order ${orderId} has already been successfully synced.`,
      });
    }

    // Must be in 'failed' state — create new attempt
    const newAttempt = attemptRepo.insert(orderId, 'manual_retry');

    // Reset order status to pending for the retry
    orderRepo.updateStatus(orderId, 'pending');

    const attemptResource = {
      id: String(newAttempt.id),
      attempt_id: newAttempt.id,
      orderId,
      order_id: orderId,
      status: 'pending',
      retry_count: newAttempt.retry_count,
      attemptNumber: newAttempt.retry_count + 1,
      createdAt: newAttempt.created_at,
      created_at: newAttempt.created_at,
    };

    // Reply 202 before firing sync
    reply.status(202).send({
      status: 'accepted',
      message: 'Retry scheduled.',
      orderId,
      attemptId: newAttempt.id,
      attempt: attemptResource,
    });

    // Load original payload from order row — never use client-supplied data for retry
    const payload = (() => {
      try { return JSON.parse(order.payload_json); } catch { return null; }
    })();

    if (!payload) {
      request.log.error(`Cannot parse payload_json for order ${orderId}`);
      return;
    }

    setImmediate(() => {
      syncService.syncAttempt(newAttempt.id, payload).catch((err) => {
        request.log.error(err, `Retry sync failed for order ${orderId}`);
      });
    });
  };

  app.post('/api/orders/:orderId/retry', retryHandler);
  app.post('/api/syncs/:id/retry', retryHandler);
  app.post('/api/sync-attempts/:id/retry', retryHandler);
  app.post('/syncs/:id/retry', retryHandler);

  return app;
}
