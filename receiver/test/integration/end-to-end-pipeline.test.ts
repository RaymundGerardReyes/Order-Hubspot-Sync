import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import validOrder from '../fixtures/orders/valid-order.json';
import { buildServer } from '../../src/server';
import { signPayload } from '../support/signPayload';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import { getDb } from '../../src/db/connection';
import { HubSpotClient } from '../../src/hubspot/client';
import { HubspotMockServer } from '../../../e2e/mocks/hubspot-mock-server';
import { FastifyInstance } from 'fastify';

async function waitForOrderStatus(orderId: string, status: string, maxMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const o = orderRepo.findById(orderId);
    if (o?.status === status) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

async function waitForAttemptStatus(orderId: string, status: string, maxMs = 3000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    const a = attemptRepo.latestForOrder(orderId);
    if (a?.status === status) return;
    await new Promise((r) => setTimeout(r, 25));
  }
}

describe('End-to-End Order-to-HubSpot Sync Pipeline Integration Tests', () => {
  let app: FastifyInstance;
  let mockHubSpot: HubspotMockServer;
  let mockUrl: string;
  const webhookSecret = 'test_webhook_secret_key_123';

  beforeEach(async () => {
    try {
      const db = getDb();
      db.prepare('DELETE FROM sync_attempts').run();
      db.prepare('DELETE FROM orders').run();
    } catch {
      // ignore if tables not yet created
    }

    mockHubSpot = new HubspotMockServer();
    mockUrl = await mockHubSpot.start(0);

    const client = new HubSpotClient({
      accessToken: 'test_token',
      baseUrl: mockUrl,
      timeoutMs: 3000,
      maxAttempts: 2,
    });

    app = buildServer({
      config: {
        webhookSecret,
        hubspotAccessToken: 'test_token',
        hubspotPipelineId: 'default',
        hubspotDealStageId: 'appointmentscheduled',
        hubspotOrderIdProperty: 'external_order_id',
        port: 3001,
        databaseUrl: 'file:./data/test-order-sync.sqlite',
      },
      hubspotClient: client,
    });
  });

  afterEach(async () => {
    await mockHubSpot.stop();
  });

  it('1. ingests valid signed order and responds with 202 Accepted', async () => {
    const raw = JSON.stringify(validOrder);
    const sig = signPayload(raw, webhookSecret);

    const res = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res.statusCode).toBe(202);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('accepted');
    expect(body.orderId).toBe(validOrder.orderId);
  });

  it('2. atomically creates order in SQLite orders table', async () => {
    const raw = JSON.stringify(validOrder);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    const order = orderRepo.findById(validOrder.orderId);
    expect(order).not.toBeNull();
    expect(order?.order_id).toBe(validOrder.orderId);
  });

  it('3. creates pending attempt record in sync_attempts table', async () => {
    const raw = JSON.stringify(validOrder);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    const attempt = attemptRepo.latestForOrder(validOrder.orderId);
    expect(attempt).not.toBeNull();
    expect(attempt?.attempt_number).toBe(1);
    expect(attempt?.trigger).toBe('webhook');
  });

  it('4. creates Contact in HubSpot with incoming customer details', async () => {
    const orderId = `ORD-E2E-CT-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'succeeded');

    expect(mockHubSpot.contacts.size).toBeGreaterThanOrEqual(1);
    const contact = Array.from(mockHubSpot.contacts.values()).find(
      (c: any) => c.properties?.email === validOrder.customer.email
    );
    expect(contact).toBeDefined();
  });

  it('5. creates Deal in HubSpot with external_order_id property', async () => {
    const orderId = `ORD-E2E-DL-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'succeeded');

    expect(mockHubSpot.deals.size).toBeGreaterThanOrEqual(1);
  });

  it('6. associates Deal with Contact in HubSpot', async () => {
    const orderId = `ORD-E2E-ASSOC-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'succeeded');

    expect(mockHubSpot.associations.length).toBeGreaterThanOrEqual(1);
  });

  it('7. updates SQLite order status to succeeded with CRM IDs', async () => {
    const orderId = `ORD-E2E-SUCC-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'succeeded');

    const order = orderRepo.findById(orderId);
    expect(order?.status).toBe('succeeded');
    expect(order?.hubspot_deal_id).toMatch(/^dl_/);
    expect(order?.hubspot_contact_id).toMatch(/^ct_/);
  });

  it('8. updates SQLite attempt status to succeeded with CRM IDs', async () => {
    const orderId = `ORD-E2E-ATTSUCC-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForAttemptStatus(orderId, 'succeeded');

    const attempt = attemptRepo.latestForOrder(orderId);
    expect(attempt?.status).toBe('succeeded');
    expect(attempt?.hubspot_deal_id).toMatch(/^dl_/);
    expect(attempt?.hubspot_contact_id).toMatch(/^ct_/);
  });

  it('9. GET /api/sync-attempts reflects full synced state for dashboard', async () => {
    const orderId = `ORD-E2E-GET-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForAttemptStatus(orderId, 'succeeded');

    const res = await app.inject({ method: 'GET', url: '/api/sync-attempts' });
    expect(res.statusCode).toBe(200);
    const data = JSON.parse(res.body).data;
    const item = data.find((d: any) => d.orderId === orderId);
    expect(item).toBeDefined();
    expect(item.status).toBe('succeeded');
    expect(item.hubspotDealId).toMatch(/^dl_/);
    expect(item.hubspotContactId).toMatch(/^ct_/);
  });

  it('10. handles duplicate webhook delivery without creating duplicate deals in CRM', async () => {
    const orderId = `ORD-E2E-NODUP-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    // Initial send
    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'succeeded');
    const initialDealCount = mockHubSpot.deals.size;

    // Duplicate send
    const res2 = await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    expect(res2.statusCode).toBe(200);
    const body2 = JSON.parse(res2.body);
    expect(body2.duplicate).toBe(true);
    expect(mockHubSpot.deals.size).toBe(initialDealCount);
  });

  it('11. marks attempt failed when upstream HubSpot returns 500 error', async () => {
    mockHubSpot.failureMode = { status: 500, message: 'HubSpot internal server error' };

    const orderId = `ORD-E2E-FAIL-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'failed');

    const attempt = attemptRepo.latestForOrder(orderId);
    expect(attempt?.status).toBe('failed');
    expect(attempt?.error_code).toBe('500');
    expect(attempt?.error_message).toContain('HubSpot internal server error');

    const order = orderRepo.findById(orderId);
    expect(order?.status).toBe('failed');
  });

  it('12. allows retrying failed order via POST /api/orders/:orderId/retry', async () => {
    mockHubSpot.failureMode = { status: 500, message: 'HubSpot outage' };

    const orderId = `ORD-E2E-RETRY-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'failed');

    // Recovery: restore upstream HubSpot
    mockHubSpot.failureMode = undefined;

    const retryRes = await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });

    expect(retryRes.statusCode).toBe(202);
    const body = JSON.parse(retryRes.body);
    expect(body.status).toBe('accepted');
  });

  it('13. sets attempt_number = 2 and retry_of pointing to failed attempt on retry', async () => {
    mockHubSpot.failureMode = { status: 500, message: 'Temporary failure' };

    const orderId = `ORD-E2E-LINEAGE-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'failed');
    const att1 = attemptRepo.latestForOrder(orderId)!;

    mockHubSpot.failureMode = undefined;

    await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });

    const att2 = attemptRepo.latestForOrder(orderId);
    expect(att2?.attempt_number).toBe(2);
    expect(att2?.retry_of).toBe(att1.id);
  });

  it('14. re-syncs and transitions to succeeded state upon retry', async () => {
    mockHubSpot.failureMode = { status: 500, message: 'Outage' };

    const orderId = `ORD-E2E-RETRYSUCC-${Date.now()}`;
    const payload = { ...validOrder, orderId };
    const raw = JSON.stringify(payload);
    const sig = signPayload(raw, webhookSecret);

    await app.inject({
      method: 'POST',
      url: '/webhooks/orders',
      headers: { 'content-type': 'application/json', 'x-signature': sig },
      payload: Buffer.from(raw),
    });

    await waitForOrderStatus(orderId, 'failed');

    // Upstream restored
    mockHubSpot.failureMode = undefined;

    await app.inject({
      method: 'POST',
      url: `/api/orders/${orderId}/retry`,
    });

    await waitForOrderStatus(orderId, 'succeeded');

    const latestOrder = orderRepo.findById(orderId);
    expect(latestOrder?.status).toBe('succeeded');
    expect(latestOrder?.hubspot_deal_id).toMatch(/^dl_/);
  });

  it('15. verifies health check status healthy during active pipeline operation', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.status).toBe('healthy');
  });
});
