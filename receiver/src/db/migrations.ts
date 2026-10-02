import { getDb } from './connection.js';

/**
 * Run all DDL migrations idempotently.
 *
 * Schema matches analysis doc §Persistence model exactly:
 *   orders        — canonical business operation, PRIMARY KEY on order_id
 *   sync_attempts — append-only attempt history, FOREIGN KEY to orders
 */
export function runMigrations(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      order_id           TEXT PRIMARY KEY,
      payload_json       TEXT NOT NULL,
      status             TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed'))
                         DEFAULT 'pending',
      hubspot_contact_id TEXT,
      hubspot_deal_id    TEXT,
      created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS sync_attempts (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id           TEXT    NOT NULL REFERENCES orders(order_id),
      trigger            TEXT    NOT NULL CHECK (trigger IN ('webhook', 'manual_retry'))
                         DEFAULT 'webhook',
      status             TEXT    NOT NULL CHECK (status IN ('pending', 'processing', 'succeeded', 'failed'))
                         DEFAULT 'pending',
      retry_count        INTEGER NOT NULL DEFAULT 0,
      hubspot_contact_id TEXT,
      hubspot_deal_id    TEXT,
      error_code         TEXT,
      error_message      TEXT,
      started_at         TEXT,
      finished_at        TEXT,
      created_at         TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE INDEX IF NOT EXISTS idx_sync_attempts_recent
      ON sync_attempts(created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_sync_attempts_order_id
      ON sync_attempts(order_id);
  `);
}
