import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/db/migrations';
import { closeDb, getDb } from '../../src/db/connection';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import validOrder from '../fixtures/orders/valid-order.json';

describe('SQLite Repositories Extended Concurrency & Lineage Tests', () => {
  beforeEach(() => {
    closeDb();
    process.env.DATABASE_URL = 'file:./data/test-repos-ext.sqlite';
    runMigrations();
    const db = getDb();
    db.prepare('DELETE FROM sync_attempts').run();
    db.prepare('DELETE FROM orders').run();
  });

  afterAll(() => {
    closeDb();
  });

  it('inserts multiple distinct orders successfully', () => {
    for (let i = 1; i <= 5; i++) {
      const payload: any = { ...validOrder, order_id: `ORD-MULTI-${i}` };
      const row = orderRepo.insertIfNew(payload);
      expect(row).not.toBeNull();
      expect(row?.order_id).toBe(`ORD-MULTI-${i}`);
    }

    const db = getDb();
    const count = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;
    expect(count).toBe(5);
  });

  it('rejects multiple sequential duplicates with atomic null returns', () => {
    const payload: any = { ...validOrder, order_id: 'ORD-DUP-TRIPLE' };

    const first = orderRepo.insertIfNew(payload);
    expect(first).not.toBeNull();

    const second = orderRepo.insertIfNew(payload);
    expect(second).toBeNull();

    const third = orderRepo.insertIfNew(payload);
    expect(third).toBeNull();
  });

  it('calculates sequential attempt numbers and lineage correctly across retries', () => {
    const orderId = 'ORD-LINEAGE-1';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);

    // Attempt #1: Initial webhook trigger
    const attempt1 = attemptRepo.insert(orderId, 'webhook');
    expect(attempt1.attempt_number).toBe(1);
    expect(attempt1.trigger).toBe('webhook');
    expect(attempt1.retry_of).toBeNull();

    attemptRepo.markFailed(attempt1.id, '500', 'Upstream failure');

    // Attempt #2: Manual retry referencing Attempt #1
    const attempt2 = attemptRepo.insert(orderId, 'manual_retry');
    expect(attempt2.attempt_number).toBe(2);
    expect(attempt2.trigger).toBe('manual_retry');
    expect(attempt2.retry_of).toBe(attempt1.id);

    attemptRepo.markFailed(attempt2.id, '503', 'Service Unavailable');

    // Attempt #3: Second manual retry referencing Attempt #2
    const attempt3 = attemptRepo.insert(orderId, 'manual_retry');
    expect(attempt3.attempt_number).toBe(3);
    expect(attempt3.trigger).toBe('manual_retry');
    expect(attempt3.retry_of).toBe(attempt2.id);
  });

  it('prevents double-claiming of in-flight attempts', () => {
    const orderId = 'ORD-DOUBLE-CLAIM';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    // Claim #1 succeeds
    const claim1 = attemptRepo.claimPending(attempt.id);
    expect(claim1).toBe(true);

    // Claim #2 fails (already processing)
    const claim2 = attemptRepo.claimPending(attempt.id);
    expect(claim2).toBe(false);

    // Attempt status is 'processing'
    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.status).toBe('processing');
  });

  it('cannot claim an attempt that has already succeeded or failed', () => {
    const orderId = 'ORD-TERMINAL-CLAIM';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    attemptRepo.markSucceeded(attempt.id, 'c_1', 'd_1');

    // Claim on succeeded attempt returns false
    const claim = attemptRepo.claimPending(attempt.id);
    expect(claim).toBe(false);
  });

  it('safely stores and sanitizes complex error codes and messages', () => {
    const orderId = 'ORD-ERR-SANITIZE';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    const sqlInjectionMsg = "Error: ' OR '1'='1'; DROP TABLE orders; -- with quotes \" and special symbols <>&";
    attemptRepo.markFailed(attempt.id, 'ERR_INJECT_400', sqlInjectionMsg);

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.status).toBe('failed');
    expect(latest?.error_code).toBe('ERR_INJECT_400');
    expect(latest?.error_message).toBe(sqlInjectionMsg);
  });

  it('handles very long error message strings without truncating database state', () => {
    const orderId = 'ORD-LONG-ERR';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    const hugeError = 'A'.repeat(4000);
    attemptRepo.markFailed(attempt.id, '500', hugeError);

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.error_message?.length).toBe(2000);
  });

  it('returns null when finding a non-existent order by ID', () => {
    const result = orderRepo.findById('NON-EXISTENT-ORD-ID');
    expect(result).toBeNull();
  });

  it('returns the exact stored payload JSON upon findById', () => {
    const orderId = 'ORD-PAYLOAD-VERIFY';
    const originalPayload: any = {
      ...validOrder,
      order_id: orderId,
      customNote: 'Custom metadata preservation test',
    };
    orderRepo.insertIfNew(originalPayload);

    const row = orderRepo.findById(orderId);
    expect(row).not.toBeNull();
    const parsed = JSON.parse(row!.payload_json);
    expect(parsed.order_id).toBe(orderId);
    expect(parsed.customNote).toBe('Custom metadata preservation test');
  });

  it('updates order status and stores CRM IDs accurately', () => {
    const orderId = 'ORD-UPDATE-CRM';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);

    orderRepo.updateStatus(orderId, 'succeeded', 'contact_hubspot_77', 'deal_hubspot_88');

    const row = orderRepo.findById(orderId);
    expect(row?.status).toBe('succeeded');
    expect(row?.hubspot_contact_id).toBe('contact_hubspot_77');
    expect(row?.hubspot_deal_id).toBe('deal_hubspot_88');
  });

  it('lists recent sync attempts with pagination limit enforcement', () => {
    for (let i = 1; i <= 6; i++) {
      const orderId = `ORD-PAGE-${i}`;
      orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
      attemptRepo.insert(orderId, 'webhook');
    }

    const limited2 = attemptRepo.listRecent(2);
    expect(limited2.length).toBe(2);

    const limited5 = attemptRepo.listRecent(5);
    expect(limited5.length).toBe(5);

    const all = attemptRepo.listRecent(50);
    expect(all.length).toBe(6);
  });

  it('listRecent returns attempts in reverse chronological order (newest first)', () => {
    const orderId = 'ORD-CHRONO';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);

    const att1 = attemptRepo.insert(orderId, 'webhook');
    const att2 = attemptRepo.insert(orderId, 'manual_retry');
    const att3 = attemptRepo.insert(orderId, 'manual_retry');

    const recent = attemptRepo.listRecent(10);
    expect(recent[0].id).toBe(att3.id);
    expect(recent[1].id).toBe(att2.id);
    expect(recent[2].id).toBe(att1.id);
  });

  it('returns null for latest attempt when order has no attempts', () => {
    const latest = attemptRepo.latestForOrder('ORD-NO-ATTEMPTS-YET');
    expect(latest).toBeNull();
  });

  it('marks attempt succeeded and stores started_at and finished_at timestamps', () => {
    const orderId = 'ORD-TIMESTAMPS';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    attemptRepo.claimPending(attempt.id);
    attemptRepo.markSucceeded(attempt.id, 'c_99', 'd_99');

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.status).toBe('succeeded');
    expect(latest?.started_at).not.toBeNull();
    expect(latest?.finished_at).not.toBeNull();
  });

  it('marks attempt failed and populates finished_at timestamp', () => {
    const orderId = 'ORD-FAIL-TIMESTAMP';
    orderRepo.insertIfNew({ ...validOrder, order_id: orderId } as any);
    const attempt = attemptRepo.insert(orderId, 'webhook');

    attemptRepo.markFailed(attempt.id, '422', 'Validation failed');

    const latest = attemptRepo.latestForOrder(orderId);
    expect(latest?.status).toBe('failed');
    expect(latest?.finished_at).not.toBeNull();
    expect(latest?.error_code).toBe('422');
  });

  it('preserves existing attempts when inserting new attempts for different orders', () => {
    orderRepo.insertIfNew({ ...validOrder, order_id: 'ORD-ISO-A' } as any);
    orderRepo.insertIfNew({ ...validOrder, order_id: 'ORD-ISO-B' } as any);

    const attA = attemptRepo.insert('ORD-ISO-A', 'webhook');
    const attB = attemptRepo.insert('ORD-ISO-B', 'webhook');

    expect(attemptRepo.latestForOrder('ORD-ISO-A')?.id).toBe(attA.id);
    expect(attemptRepo.latestForOrder('ORD-ISO-B')?.id).toBe(attB.id);
  });
});
