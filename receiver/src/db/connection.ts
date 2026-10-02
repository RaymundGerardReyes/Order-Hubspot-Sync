import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let _db: Database.Database | null = null;

/**
 * Return the singleton SQLite connection.
 * The database file path is taken from DATABASE_URL env (strip the "file:" prefix).
 */
export function getDb(): Database.Database {
  if (_db) return _db;

  const rawUrl = process.env.DATABASE_URL || 'file:./data/order-sync.sqlite';
  const filePath = rawUrl.replace(/^file:/, '');
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  _db = new Database(filePath);
  // Enable WAL mode for concurrent reads during sync worker writes
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  return _db;
}

/** Close the database (used in tests). */
export function closeDb(): void {
  _db?.close();
  _db = null;
}
