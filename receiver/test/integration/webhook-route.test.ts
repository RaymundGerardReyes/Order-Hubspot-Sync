import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import { buildTestApp } from '../support/buildTestApp';
import { FakeBackend } from '../support/fakeBackend';
import { signPayload } from '../support/signPayload';

describe('Webhook Route Integration Tests', () => {
  let fakeBackend: FakeBackend;
  let backendUrl: string;

  beforeAll(async () => {
    fakeBackend = new FakeBackend({ status: 202 });
    backendUrl = await fakeBackend.start();
  });

  afterAll(async () => {
    await fakeBackend.stop();
  });

  it('accepts and forwards a valid, signed webhook request', async () => {
    const app = buildTestApp({ customConfig: { backendUrl } });
    const rawPayload = JSON.stringify(validOrder);
    const signature = signPayload(rawPayload);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
      },
      payload: Buffer.from(rawPayload),
    });

    expect(response.statusCode).toBe(202);
    expect(fakeBackend.requestsReceived.length).toBeGreaterThan(0);
  });

  it('rejects with 401 when signature is invalid or missing', async () => {
    const app = buildTestApp({ customConfig: { backendUrl } });
    const rawPayload = JSON.stringify(validOrder);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': 'sha256=' + '0'.repeat(64),
      },
      payload: Buffer.from(rawPayload),
    });

    expect(response.statusCode).toBe(401);
  });

  it('rejects with 422 when payload violates schema', async () => {
    const app = buildTestApp({ customConfig: { backendUrl } });
    const invalidPayload = { orderId: 'ORD-123' }; // Missing required customer and items
    const rawPayload = JSON.stringify(invalidPayload);
    const signature = signPayload(rawPayload);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
      },
      payload: Buffer.from(rawPayload),
    });

    expect(response.statusCode).toBe(422);
  });
});
