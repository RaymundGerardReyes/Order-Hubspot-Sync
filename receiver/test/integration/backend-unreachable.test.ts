import { describe, expect, it } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';

describe('Backend Unreachable Integration Test', () => {
  it('returns 502 Bad Gateway when backend cannot be reached', async () => {
    // Non-existent backend port
    const app = buildTestApp({
      customConfig: { backendUrl: 'http://127.0.0.1:59999' },
    });

    const rawPayload = JSON.stringify(validOrder);
    const signature = signPayload(rawPayload);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-signature': signature,
        'x-request-id': 'req-unreachable-test',
      },
      payload: Buffer.from(rawPayload),
    });

    expect(response.statusCode).toBe(502);
    const body = JSON.parse(response.body);
    expect(body.error).toBe('Bad Gateway');
  });
});
