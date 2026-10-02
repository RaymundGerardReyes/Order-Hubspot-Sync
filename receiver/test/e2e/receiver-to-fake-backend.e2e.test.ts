import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FakeBackend } from '../support/fakeBackend';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import validOrder from '../fixtures/orders/valid-order.json';
import { FastifyInstance } from 'fastify';

describe('Receiver to Fake Backend E2E', () => {
  let fakeBackend: FakeBackend;
  let backendUrl: string;
  let app: FastifyInstance;
  let receiverUrl: string;
  const webhookSecret = 'test_webhook_secret_key_123';
  const internalToken = 'test_internal_shared_token_456';

  beforeAll(async () => {
    fakeBackend = new FakeBackend({
      status: 202,
      responseBody: { status: 'accepted', attempt_id: 'att_e2e_123' },
    });
    backendUrl = await fakeBackend.start();

    app = buildTestApp({
      customConfig: {
        backendUrl,
        webhookSecret,
        internalToken,
      },
    });

    const address = await app.listen({ port: 0, host: '127.0.0.1' });
    receiverUrl = address;
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (fakeBackend) {
      await fakeBackend.stop();
    }
  });

  it('receives signed webhook over real HTTP socket and forwards to backend unchanged', async () => {
    const rawPayload = JSON.stringify(validOrder);
    const signature = signPayload(rawPayload, webhookSecret, true);

    const response = await fetch(`${receiverUrl}/webhooks/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
        'X-Request-Id': 'req-socket-e2e-001',
      },
      body: rawPayload,
    });

    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data).toEqual({ status: 'accepted', attempt_id: 'att_e2e_123' });

    // Assert backend received request with internal auth and request id
    expect(fakeBackend.requestsReceived).toHaveLength(1);
    const backendReq = fakeBackend.requestsReceived[0];
    expect(backendReq.headers['authorization']).toBe(`Bearer ${internalToken}`);
    expect(backendReq.headers['x-request-id']).toBe('req-socket-e2e-001');
    expect(backendReq.body).toEqual(validOrder);
  });
});
