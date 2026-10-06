import { describe, expect, it, beforeEach } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import { buildTestApp } from '../support/buildTestApp';
import { signPayload } from '../support/signPayload';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import { getDb } from '../../src/db/connection';
import { FastifyInstance } from 'fastify';

describe('Webhook Route Extended Integration Tests (HTTP & Security Contract)', () => {
  let app: FastifyInstance;
  const webhookSecret = 'test_webhook_secret_key_123';

  beforeEach(() => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM sync_attempts').run();
      db.prepare('DELETE FROM orders').run();
    } catch {
      // ignore if tables not yet migrated
    }
    app = buildTestApp({ customConfig: { webhookSecret } });
  });

  // ── HTTP Methods & Content-Type ──────────────────────────────────────────

  it('rejects HTTP GET on /webhooks/orders with 404', async () => {
    const res = await app.inject({ method: 'GET', url: '/webhooks/orders' });
    expect(res.statusCode).toBe(404);
  });

  it('rejects HTTP PUT on /webhooks/orders with 404', async () => {
    const res = await app.inject({ method: 'PUT', url: '/webhooks/orders', body: {} });
    expect(res.statusCode).toBe(404);
  });

  it('rejects HTTP DELETE on /webhooks/orders with 404', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/webhooks/orders' });
    expect(res.statusCode).toBe(404);
  });

  it('rejects text/plain content-type with 415 or 400', async () => {
    const raw = JSON.stringify(validOrder);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'text/plain', 'x-signature': sig },
      body: raw,
    });
    expect([415, 400]).toContain(res.statusCode);
  });

  it('accepts application/json; charset=utf-8 content-type', async () => {
    const order = { ...validOrder, orderId: `ORD-CHARSET-${Date.now()}` };
    const raw = JSON.stringify(order);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json; charset=utf-8', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  // ── Signature Header Variations ──────────────────────────────────────────

  it('accepts signature delivered via lowercase x-signature header', async () => {
    const order = { ...validOrder, orderId: `ORD-SIG-LOWER-${Date.now()}` };
    const raw = JSON.stringify(order);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts signature delivered via uppercase X-Signature header', async () => {
    const order = { ...validOrder, orderId: `ORD-SIG-UPPER-${Date.now()}` };
    const raw = JSON.stringify(order);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'X-Signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts signature delivered via lowercase x-webhook-signature header', async () => {
    const order = { ...validOrder, orderId: `ORD-SIG-WHLOWER-${Date.now()}` };
    const raw = JSON.stringify(order);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-webhook-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts signature delivered via uppercase X-Webhook-Signature header', async () => {
    const order = { ...validOrder, orderId: `ORD-SIG-WHUPPER-${Date.now()}` };
    const raw = JSON.stringify(order);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'X-Webhook-Signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('rejects signature with non-hex characters with 401', async () => {
    const raw = JSON.stringify(validOrder);
    const invalidSig = 'sha256=' + 'z'.repeat(64);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': invalidSig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects signature that is too short with 401', async () => {
    const raw = JSON.stringify(validOrder);
    const shortSig = 'sha256=abcdef12345';
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': shortSig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects signature that is too long with 401', async () => {
    const raw = JSON.stringify(validOrder);
    const longSig = 'sha256=' + 'a'.repeat(70);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': longSig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(401);
  });

  it('rejects request with missing signature header with 401', async () => {
    const raw = JSON.stringify(validOrder);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json' },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.message).toMatch(/missing signature/i);
  });

  // ── JSON Body & Schema Invariants ────────────────────────────────────────

  it('rejects malformed unparseable JSON with 400 Bad Request', async () => {
    const raw = '{"orderId": "ORD-123", broken json here';
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects empty payload body with 400 or 401', async () => {
    const raw = '';
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect([400, 401]).toContain(res.statusCode);
  });

  it('rejects payload with missing event name with 422', async () => {
    const payload = { ...validOrder, event: undefined };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects payload with empty items array with 422', async () => {
    const payload = { ...validOrder, items: [], totalAmount: 0 };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects payload with line item quantity 0 with 422', async () => {
    const payload = {
      ...validOrder,
      items: [{ sku: 'SKU-1', name: 'Item', quantity: 0, unitPrice: 10 }],
      totalAmount: 0,
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects payload with negative item price with 422', async () => {
    const payload = {
      ...validOrder,
      items: [{ sku: 'SKU-1', name: 'Item', quantity: 1, unitPrice: -10 }],
      totalAmount: -10,
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects mathematical discrepancy where total is less than sum of items (422)', async () => {
    const payload = {
      ...validOrder,
      items: [{ sku: 'SKU-1', name: 'Item', quantity: 2, unitPrice: 50 }],
      totalAmount: 90, // Discrepancy: 100 != 90
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects mathematical discrepancy where total is greater than sum of items (422)', async () => {
    const payload = {
      ...validOrder,
      items: [{ sku: 'SKU-1', name: 'Item', quantity: 2, unitPrice: 50 }],
      totalAmount: 110, // Discrepancy: 100 != 110
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects invalid customer email format with 422', async () => {
    const payload = {
      ...validOrder,
      customer: { name: 'Test', email: 'not-a-valid-email-address' },
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects non-3-letter currency code with 422', async () => {
    const payload = { ...validOrder, currency: 'US' };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('rejects lowercase currency code with 422', async () => {
    const payload = { ...validOrder, currency: 'usd' };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(422);
  });

  it('accepts precision pricing order (3 items * 33.33 = 99.99)', async () => {
    const payload = {
      ...validOrder,
      orderId: `ORD-PREC-${Date.now()}`,
      items: [{ sku: 'SKU-P3', name: 'Item', quantity: 3, unitPrice: 33.33 }],
      totalAmount: 99.99,
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts order with free promotional item (price 0.00) alongside paid item', async () => {
    const payload = {
      ...validOrder,
      orderId: `ORD-FREE-${Date.now()}`,
      items: [
        { sku: 'SKU-PAID', name: 'Main Item', quantity: 1, unitPrice: 50.0 },
        { sku: 'SKU-FREE', name: 'Free Gift', quantity: 1, unitPrice: 0.0 },
      ],
      totalAmount: 50.0,
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts order with 5 distinct items with exact summation match', async () => {
    const items = [
      { sku: 'SKU-1', name: 'Item 1', quantity: 1, unitPrice: 10.0 },
      { sku: 'SKU-2', name: 'Item 2', quantity: 2, unitPrice: 15.0 },
      { sku: 'SKU-3', name: 'Item 3', quantity: 3, unitPrice: 20.0 },
      { sku: 'SKU-4', name: 'Item 4', quantity: 1, unitPrice: 25.0 },
      { sku: 'SKU-5', name: 'Item 5', quantity: 2, unitPrice: 5.0 },
    ];
    // 10 + 30 + 60 + 25 + 10 = 135
    const payload = {
      ...validOrder,
      orderId: `ORD-5ITEMS-${Date.now()}`,
      items,
      totalAmount: 135.0,
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  it('accepts customer name with international accents and emojis', async () => {
    const payload = {
      ...validOrder,
      orderId: `ORD-INTL-${Date.now()}`,
      customer: {
        name: 'Hélène Müller 🌟',
        email: 'helene.mueller@example.de',
      },
    };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);
    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res.statusCode).toBe(202);
  });

  // ── Database State & Idempotency Lifecycle ───────────────────────────────

  it('persists incoming order into SQLite orders table with status pending', async () => {
    const orderId = `ORD-PERSIST-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res.statusCode).toBe(202);
    const saved = orderRepo.findById(orderId);
    expect(saved).not.toBeNull();
    expect(saved?.order_id).toBe(orderId);
    expect(saved?.status).toBe('pending');
  });

  it('creates pending attempt in sync_attempts table with attempt_number 1', async () => {
    const orderId = `ORD-ATTEMPT-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res.statusCode).toBe(202);
    const attempt = attemptRepo.latestForOrder(orderId);
    expect(attempt).not.toBeNull();
    expect(attempt?.attempt_number).toBe(1);
    expect(attempt?.status).toBe('pending');
  });

  it('sequential duplicate webhook returns HTTP 200 with duplicate: true', async () => {
    const orderId = `ORD-DUP-INTEG-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    const res1 = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res1.statusCode).toBe(202);

    const res2 = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });
    expect(res2.statusCode).toBe(200);
    const body = JSON.parse(res2.body);
    expect(body.duplicate).toBe(true);
    expect(body.orderId).toBe(orderId);
  });

  it('duplicate webhook does not create extra rows in orders table', async () => {
    const orderId = `ORD-NOROWS-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    const db = getDb();
    const count = (
      db.prepare('SELECT COUNT(*) as cnt FROM orders WHERE order_id = ?').get(orderId) as { cnt: number }
    ).cnt;
    expect(count).toBe(1);
  });

  it('duplicate delivery while attempt is in-flight returns status in_progress', async () => {
    const orderId = `ORD-INFLIGHT-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.duplicate).toBe(true);
    expect(body.status).toBe('in_progress');
  });

  it('duplicate delivery after order succeeded returns status succeeded', async () => {
    const orderId = `ORD-SUCCEEDED-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    // Mark attempt succeeded
    const attempt = attemptRepo.latestForOrder(orderId);
    if (attempt) {
      attemptRepo.markSucceeded(attempt.id, 'contact-202', 'deal-101');
      orderRepo.updateStatus(orderId, 'succeeded', 'contact-202', 'deal-101');
    }

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.duplicate).toBe(true);
    expect(body.status).toBe('succeeded');
    expect(body.hubspotDealId).toBe('deal-101');
    expect(body.hubspotContactId).toBe('contact-202');
  });

  it('sequentially processes 5 distinct orders returning 202 for each', async () => {
    for (let i = 1; i <= 5; i++) {
      const orderId = `ORD-SEQ-${i}-${Date.now()}`;
      const payload = { ...validOrder, orderId };
      const raw = JSON.stringify(payload);
      const sig = signPayload(raw, webhookSecret);

      const res = await app.inject({
        method: 'POST',
        url: '/webhooks/orders',
        headers: { 'content-type': 'application/json', 'x-signature': sig },
        payload: Buffer.from(raw),
      });

      expect(res.statusCode).toBe(202);
    }

    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;
    expect(count).toBe(5);
  });
});
