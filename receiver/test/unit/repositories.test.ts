import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { runMigrations } from '../../src/db/migrations';
import { closeDb, getDb } from '../../src/db/connection';
import { attemptRepo, orderRepo } from '../../src/db/repositories';
import validOrder from '../fixtures/orders/valid-order.json';

describe('SQLite Repositories Unit Tests', () => {
  beforeEach(() => {
    closeDb();
    process.env.DATABASE_URL = 'file:./data/test-repos.sqlite';
    runMigrations();
    const db = getDb();
    db.prepare('DELETE FROM sync_attempts').run();
    db.prepare('DELETE FROM orders').run();
  });

  it('inserts an order and enforces uniqueness on duplicate order_id', () => {
    const payload: any = {
      ...validOrder,
      order_id: validOrder.orderId,
    };

    const first = orderRepo.insertIfNew(payload);
    expect(first).not.toBeNull();
    expect(first?.order_id).toBe('ORD-10482');

    // Duplicate insert returns null
    const second = orderRepo.insertIfNew(payload);
    expect(second).toBeNull();
  });

  it('atomically claims a pending attempt preventing double-processing', () => {
    const payload: any = { ...validOrder, order_id: 'ORD-CLAIM-1' };
    orderRepo.insertIfNew(payload);

    const attempt = attemptRepo.insert('ORD-CLAIM-1', 'webhook');
    expect(attempt.status).toBe('pending');

    // First claim succeeds
    const claimedFirst = attemptRepo.claimPending(attempt.id);
    expect(claimedFirst).toBe(true);

    // Second claim fails because status is already 'processing'
    const claimedSecond = attemptRepo.claimPending(attempt.id);
    expect(claimedSecond).toBe(false);
  });

  it('records succeeded attempt and updates canonical order', () => {
    const payload: any = { ...validOrder, order_id: 'ORD-SUCC-1' };
    orderRepo.insertIfNew(payload);
    const attempt = attemptRepo.insert('ORD-SUCC-1', 'webhook');

    attemptRepo.markSucceeded(attempt.id, 'contact_123', 'deal_456');
    orderRepo.updateStatus('ORD-SUCC-1', 'succeeded', 'contact_123', 'deal_456');

    const updatedOrder = orderRepo.findById('ORD-SUCC-1');
    expect(updatedOrder?.status).toBe('succeeded');
    expect(updatedOrder?.hubspot_deal_id).toBe('deal_456');
    expect(updatedOrder?.hubspot_contact_id).toBe('contact_123');
  });

  it('records failed attempt with error code and error message', () => {
    const payload: any = { ...validOrder, order_id: 'ORD-FAIL-1' };
    orderRepo.insertIfNew(payload);
    const attempt = attemptRepo.insert('ORD-FAIL-1', 'webhook');

    attemptRepo.markFailed(attempt.id, '503', 'HubSpot rate limit exceeded');
    const updated = attemptRepo.findById(attempt.id);
    expect(updated?.status).toBe('failed');
    expect(updated?.error_code).toBe('503');
    expect(updated?.error_message).toContain('HubSpot rate limit exceeded');
  });

  it('increments attempt_number and links retry_of across sequential retries', () => {
    const payload: any = { ...validOrder, order_id: 'ORD-RETRY-SEQ' };
    orderRepo.insertIfNew(payload);

    const first = attemptRepo.insert('ORD-RETRY-SEQ', 'webhook');
    expect(first.attempt_number).toBe(1);
    expect(first.retry_count).toBe(0);
    expect(first.retry_of).toBeNull();

    const second = attemptRepo.insert('ORD-RETRY-SEQ', 'manual_retry');
    expect(second.attempt_number).toBe(2);
    expect(second.retry_count).toBe(1);
    expect(second.retry_of).toBe(first.id);

    const third = attemptRepo.insert('ORD-RETRY-SEQ', 'manual_retry');
    expect(third.attempt_number).toBe(3);
    expect(third.retry_count).toBe(2);
    expect(third.retry_of).toBe(second.id);
  });

  afterAll(() => {
    closeDb();
  });
});
