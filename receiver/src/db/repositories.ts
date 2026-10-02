import { getDb } from './connection.js';
import type { OrderPayload } from '../schema.js';

// ─── Types ───────────────────────────────────────────────────────────────────

export type OrderStatus = 'pending' | 'processing' | 'succeeded' | 'failed';
export type AttemptTrigger = 'webhook' | 'manual_retry';

export interface OrderRow {
  order_id: string;
  payload_json: string;
  status: OrderStatus;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttemptRow {
  id: number;
  order_id: string;
  trigger: AttemptTrigger;
  status: OrderStatus;
  retry_count: number;
  hubspot_contact_id: string | null;
  hubspot_deal_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// ─── Order repository ────────────────────────────────────────────────────────

export const orderRepo = {
  /**
   * Insert a new order row. Returns null if order_id already exists (UNIQUE conflict).
   * analysis doc: "The primary key makes order_id insertion atomic even when duplicate requests arrive concurrently."
   */
  insertIfNew(payload: OrderPayload): OrderRow | null {
    const db = getDb();
    const stmt = db.prepare<[string, string], OrderRow>(`
      INSERT INTO orders (order_id, payload_json, status)
      VALUES (?, ?, 'pending')
      ON CONFLICT(order_id) DO NOTHING
      RETURNING *
    `);
    const orderId = payload.order_id || (payload as any).orderId;
    return stmt.get(orderId, JSON.stringify(payload)) ?? null;
  },

  findById(orderId: string): OrderRow | null {
    const db = getDb();
    return db.prepare<[string], OrderRow>(
      'SELECT * FROM orders WHERE order_id = ?'
    ).get(orderId) ?? null;
  },

  updateStatus(
    orderId: string,
    status: OrderStatus,
    hubspotContactId?: string | null,
    hubspotDealId?: string | null
  ): void {
    const db = getDb();
    db.prepare(`
      UPDATE orders
      SET status = ?, hubspot_contact_id = COALESCE(?, hubspot_contact_id),
          hubspot_deal_id = COALESCE(?, hubspot_deal_id),
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE order_id = ?
    `).run(status, hubspotContactId ?? null, hubspotDealId ?? null, orderId);
  },
};

// ─── Attempt repository ──────────────────────────────────────────────────────

export const attemptRepo = {
  insert(orderId: string, trigger: AttemptTrigger = 'webhook'): AttemptRow {
    const db = getDb();
    const info = db.prepare(`
      INSERT INTO sync_attempts (order_id, trigger, status)
      VALUES (?, ?, 'pending')
    `).run(orderId, trigger);
    return db.prepare<[number], AttemptRow>(
      'SELECT * FROM sync_attempts WHERE id = ?'
    ).get(info.lastInsertRowid as number)!;
  },

  findById(id: number): AttemptRow | null {
    const db = getDb();
    return db.prepare<[number], AttemptRow>(
      'SELECT * FROM sync_attempts WHERE id = ?'
    ).get(id) ?? null;
  },

  latestForOrder(orderId: string): AttemptRow | null {
    const db = getDb();
    return db.prepare<[string], AttemptRow>(
      'SELECT * FROM sync_attempts WHERE order_id = ? ORDER BY created_at DESC LIMIT 1'
    ).get(orderId) ?? null;
  },

  /**
   * Atomically claim a pending attempt → processing.
   * Returns true only if the row was still 'pending' when updated (prevents double-claim).
   */
  claimPending(attemptId: number): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const info = db.prepare(`
      UPDATE sync_attempts
      SET status = 'processing', started_at = ?
      WHERE id = ? AND status = 'pending'
    `).run(now, attemptId);
    return info.changes === 1;
  },

  markSucceeded(
    attemptId: number,
    hubspotContactId: string,
    hubspotDealId: string
  ): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE sync_attempts
      SET status = 'succeeded', hubspot_contact_id = ?, hubspot_deal_id = ?,
          finished_at = ?
      WHERE id = ?
    `).run(hubspotContactId, hubspotDealId, now, attemptId);
  },

  markFailed(attemptId: number, errorCode: string, errorMessage: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE sync_attempts
      SET status = 'failed', error_code = ?, error_message = ?,
          finished_at = ?
      WHERE id = ?
    `).run(errorCode, errorMessage.slice(0, 2000), now, attemptId);
  },

  incrementRetry(attemptId: number): void {
    const db = getDb();
    db.prepare(
      'UPDATE sync_attempts SET retry_count = retry_count + 1 WHERE id = ?'
    ).run(attemptId);
  },

  /** Return newest 50 attempts joined with order details for the dashboard. */
  listRecent(limit = 50): DashboardRow[] {
    const db = getDb();
    return db.prepare<[number], DashboardRow>(`
      SELECT
        a.id           AS attempt_id,
        a.order_id,
        a.trigger,
        a.status,
        a.retry_count,
        a.hubspot_contact_id,
        a.hubspot_deal_id,
        a.error_code,
        a.error_message,
        a.started_at,
        a.finished_at,
        a.created_at,
        o.payload_json
      FROM sync_attempts a
      JOIN orders o ON o.order_id = a.order_id
      ORDER BY a.created_at DESC
      LIMIT ?
    `).all(limit);
  },
};

export interface DashboardRow extends AttemptRow {
  payload_json: string;
}
