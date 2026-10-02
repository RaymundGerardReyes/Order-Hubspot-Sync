import { describe, expect, it, beforeEach } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import briefOrder from '../fixtures/orders/brief-sample-order.json';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import { getDb } from '../../src/db/connection';

describe('Webhook Route & API Integration Tests', () => {
  beforeEach(() => {
    // Reset test database tables between tests
    try {
      const db = getDb();
      db.prepare('DELETE FROM sync_attempts').run();
      db.prepare('DELETE FROM orders').run();
    } catch {
      // Ignored if tables not yet created
    }
  });

  it('accepts and persists a valid, signed webhook request with 202 Accepted', async () => {
    const app = buildTestApp();
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
    const body = JSON.parse(response.body);
    expect(body.status).toBe('accepted');
    expect(body.orderId).toBe('ORD-10482');

    // Verify row was persisted in SQLite
    const order = orderRepo.findById('ORD-10482');
    expect(order).not.toBeNull();
    expect(order?.order_id).toBe('ORD-10482');
  });

  it('enforces idempotency on duplicate order_id (Req 24) returning 200 OK', async () => {
    const app = buildTestApp();
    const rawPayload = JSON.stringify(validOrder);
    const signature = signPayload(rawPayload);

    // First request
    const res1 = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': signature },
      payload: Buffer.from(rawPayload),
    });
    expect(res1.statusCode).toBe(202);

    // Second duplicate request
    const res2 = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': signature },
      payload: Buffer.from(rawPayload),
    });

    expect(res2.statusCode).toBe(200);
    const body = JSON.parse(res2.body);
    expect(body.duplicate).toBe(true);
    expect(body.orderId).toBe('ORD-10482');
  });

  it('rejects with 401 when signature is invalid or missing', async () => {
    const app = buildTestApp();
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
    const app = buildTestApp();
    const invalidPayload = { orderId: 'ORD-123' }; // Missing required event, customer and items
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

  it('accepts exact Stage 2 brief sample payload with X-Webhook-Signature', async () => {
    const app = buildTestApp();
    const rawPayload = JSON.stringify(briefOrder);
    const signature = signPayload(rawPayload);

    const response = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: {
        'content-type': 'application/json',
        'x-webhook-signature': signature,
      },
      payload: Buffer.from(rawPayload),
    });

    expect(response.statusCode).toBe(202);
  });

  it('returns sync attempts list on GET /api/sync-attempts (Req 27)', async () => {
    const app = buildTestApp();

    // Ingest an order
    const rawPayload = JSON.stringify(validOrder);
    const signature = signPayload(rawPayload);
    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': signature },
      payload: Buffer.from(rawPayload),
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/sync-attempts?limit=50',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.data).toBeInstanceOf(Array);
    expect(body.data.length).toBeGreaterThanOrEqual(1);
    expect(body.data[0].order_id).toBe('ORD-10482');
    expect(body.data[0].orderId).toBe('ORD-10482');
  });

  it('handles retry endpoint POST /api/orders/:orderId/retry (Req 27)', async () => {
    const app = buildTestApp();

    // Create an order in failed status
    orderRepo.insertIfNew(validOrder as any);
    const attempt = attemptRepo.insert(validOrder.orderId, 'webhook');
    attemptRepo.markFailed(attempt.id, '500', 'HubSpot test error');
    orderRepo.updateStatus(validOrder.orderId, 'failed');

    const response = await app.inject({
      method: 'POST',
      url: `/api/orders/${validOrder.orderId}/retry`,
    });

    expect(response.statusCode).toBe(202);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('accepted');
    expect(body.orderId).toBe(validOrder.orderId);
  });
});
