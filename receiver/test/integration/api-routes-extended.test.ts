import { describe, expect, it, beforeEach } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import { buildTestApp } from '../support/buildTestApp';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import { getDb } from '../../src/db/connection';
import { FastifyInstance } from 'fastify';

describe('API Routes Extended Integration Tests (REST Endpoints & State Machine)', () => {
  let app: FastifyInstance;

  beforeEach(() => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM sync_attempts').run();
      db.prepare('DELETE FROM orders').run();
    } catch {
      // ignore if tables not yet created
    }
    app = buildTestApp();
  });

  // ── Health Check Endpoints ───────────────────────────────────────────────

  it('GET /health returns 200 with status healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
    expect(body.timestamp).toBeDefined();
  });

  it('GET /healthz returns 200 with status healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
  });

  it('GET /api/health returns 200 with status healthy', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
  });

  // ── GET /api/sync-attempts Collection & Query Limits ─────────────────────

  it('GET /api/sync-attempts returns empty data array when table is empty', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data).toEqual([]);
  });

  it('GET /api/sync-attempts returns all recorded attempts', async () => {
    const orderId = 'ORD-ATT-ALL';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    attemptRepo.insert(orderId, 'webhook');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
    expect(body.data[0].orderId).toBe(orderId);
  });

  it('GET /api/sync-attempts?limit=2 enforces requested limit', async () => {
    for (let i = 1; i <= 5; i++) {
      const orderId = `ORD-LIM-${i}`;
      orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
      attemptRepo.insert(orderId, 'webhook');
    }

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts?limit=2' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(2);
  });

  it('GET /api/sync-attempts?limit=1 returns exactly 1 item', async () => {
    for (let i = 1; i <= 3; i++) {
      const orderId = `ORD-ONE-${i}`;
      orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
      attemptRepo.insert(orderId, 'webhook');
    }

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts?limit=1' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(1);
  });

  it('GET /api/sync-attempts?limit=0 falls back to default limit', async () => {
    for (let i = 1; i <= 3; i++) {
      const orderId = `ORD-ZERO-${i}`;
      orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
      attemptRepo.insert(orderId, 'webhook');
    }

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts?limit=0' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(3);
  });

  it('GET /api/sync-attempts?limit=-10 handles negative limit safely', async () => {
    for (let i = 1; i <= 3; i++) {
      const orderId = `ORD-NEG-${i}`;
      orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
      attemptRepo.insert(orderId, 'webhook');
    }

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts?limit=-10' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.length).toBe(3);
  });

  it('GET /api/sync-attempts orders records with latest first', async () => {
    const o1 = 'ORD-SORT-FIRST';
    const o2 = 'ORD-SORT-SECOND';
    orderRepo.insertIfNew({ ...validOrder, order_id: o1 } as any);
    attemptRepo.insert(o1, 'webhook');

    orderRepo.insertIfNew({ ...validOrder, order_id: o2 } as any);
    attemptRepo.insert(o2, 'webhook');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    const body = JSON.parse(res.body);
    expect(body.data[0].orderId).toBe(o2);
    expect(body.data[1].orderId).toBe(o1);
  });

  it('GET /api/sync-attempts provides complete field set for UI consumers', async () => {
    const orderId = 'ORD-FIELDS';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    attemptRepo.insert(orderId, 'webhook');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    const attempt = JSON.parse(res.body).data[0];

    expect(attempt).toHaveProperty('id');
    expect(attempt).toHaveProperty('orderId');
    expect(attempt).toHaveProperty('status');
    expect(attempt).toHaveProperty('createdAt');
    expect(attempt).toHaveProperty('attemptNumber');
    expect(attempt).toHaveProperty('hubspotDealId');
    expect(attempt).toHaveProperty('hubspotContactId');
    expect(attempt).toHaveProperty('failureCode');
    expect(attempt).toHaveProperty('failureMessage');
  });

  it('GET /api/sync-attempts populates hubspot CRM IDs when successful', async () => {
    const orderId = 'ORD-CRM-POP';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markSucceeded(att.id, 'contact-999', 'deal-888');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    const attempt = JSON.parse(res.body).data[0];

    expect(attempt.status).toBe('succeeded');
    expect(attempt.hubspotDealId).toBe('deal-888');
    expect(attempt.hubspotContactId).toBe('contact-999');
  });

  it('GET /api/sync-attempts populates failure code and message when failed', async () => {
    const orderId = 'ORD-FAIL-POP';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markFailed(att.id, '429', 'Rate limit exceeded');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    const attempt = JSON.parse(res.body).data[0];

    expect(attempt.status).toBe('failed');
    expect(attempt.failureCode).toBe('429');
    expect(attempt.failureMessage).toBe('Rate limit exceeded');
  });

  // ── POST /api/orders/:orderId/retry State Transitions ────────────────────

  it('POST /api/orders/:orderId/retry returns 404 for nonexistent order', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/orders/NONEXISTENT-ORDER/retry',
    });
    expect(res.statusCode).toBe(404);
    const body = JSON.parse(res.body);
    expect(body.message).toMatch(/not found/i);
  });

  it('POST /api/orders/:orderId/retry returns 409 Conflict when order is succeeded', async () => {
    const orderId = 'ORD-SUCC-RETRY';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markSucceeded(att.id, 'contact-1', 'deal-1');
    orderRepo.updateStatus(orderId, 'succeeded', 'contact-1', 'deal-1');

    const res = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });
    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.message).toMatch(/only failed/i);
  });

  it('POST /api/orders/:orderId/retry returns 409 Conflict when order is pending', async () => {
    const orderId = 'ORD-PEND-RETRY';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    attemptRepo.insert(orderId, 'webhook');

    const res = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/orders/:orderId/retry returns 409 Conflict when order is processing', async () => {
    const orderId = 'ORD-PROC-RETRY';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.claimPending(att.id);
    orderRepo.updateStatus(orderId, 'processing');

    const res = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });
    expect(res.statusCode).toBe(409);
  });

  it('POST /api/orders/:orderId/retry accepts retry for failed order returning 202', async () => {
    const orderId = 'ORD-FAIL-RETRY';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markFailed(att.id, '500', 'HubSpot server error');
    orderRepo.updateStatus(orderId, 'failed');

    const res = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });
    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('accepted');
    expect(body.orderId).toBe(orderId);
  });

  it('POST /api/orders/:orderId/retry increments attempt_number on retry', async () => {
    const orderId = 'ORD-ATT-NUM';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    expect(att.attempt_number).toBe(1);

    attemptRepo.markFailed(att.id, '500', 'HubSpot error');
    orderRepo.updateStatus(orderId, 'failed');

    const res = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });
    expect(res.statusCode).toBe(202);

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.attempt_number).toBe(2);
  });

  it('POST /api/orders/:orderId/retry sets retry_of pointing to prior failed attempt', async () => {
    const orderId = 'ORD-LINEAGE-PTR';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att1 = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markFailed(att1.id, '500', 'HubSpot error');
    orderRepo.updateStatus(orderId, 'failed');

    await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.retry_of).toBe(att1.id);
  });

  it('POST /api/orders/:orderId/retry resets order status in orders table to pending', async () => {
    const orderId = 'ORD-RESET-STATUS';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const att = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markFailed(att.id, '500', 'HubSpot error');
    orderRepo.updateStatus(orderId, 'failed');

    await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });

    const order = orderRepo.findById(orderId);
    expect(order?.status).toBe('pending');
  });

  it('POST /api/orders/:orderId/retry handles second sequential retry reaching attempt_number 3', async () => {
    const orderId = 'ORD-RETRY-TWICE';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);

    // Attempt 1 fails
    const att1 = attemptRepo.insert(orderId, 'webhook');
    attemptRepo.markFailed(att1.id, '500', 'Fail 1');
    orderRepo.updateStatus(orderId, 'failed');

    // Retry 1
    await app.inject({ method: 'POST', url: `/api/orders/${orderId}/retry` });
    const att2 = attemptRepo.latestForOrder(orderId)!;
    expect(att2.attempt_number).toBe(2);

    // Attempt 2 fails
    attemptRepo.markFailed(att2.id, '500', 'Fail 2');
    orderRepo.updateStatus(orderId, 'failed');

    // Retry 2
    const res2 = await app.inject({ method: 'POST', url: `/api/orders/${orderId}/retry` });
    expect(res2.statusCode).toBe(202);

    const att3 = attemptRepo.latestForOrder(orderId)!;
    expect(att3.attempt_number).toBe(3);
    expect(att3.retry_of).toBe(att2.id);
  });

  // ── CORS & Route Boundaries ──────────────────────────────────────────────

  it('OPTIONS /api/orders/:orderId/retry responds with 204 and CORS preflight headers', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/orders/ORD-10482/retry',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(res.headers['access-control-allow-methods']).toContain('POST');
  });

  it('OPTIONS /api/sync-attempts responds with 204 and CORS preflight headers', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/api/sync-attempts',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
      },
    });

    expect(res.statusCode).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });

  it('GET /api/nonexistent-route returns 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/nonexistent-route' });
    expect(res.statusCode).toBe(404);
  });
});
