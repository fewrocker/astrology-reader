import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH ?? './data/astrology.db';

let instance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (instance) return instance;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  instance = new Database(DB_PATH);
  instance.pragma('journal_mode = WAL');
  instance.pragma('foreign_keys = ON');

  instance.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      birth_date TEXT,
      birth_time TEXT,
      birth_place TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      date TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_entries_user_kind_date
      ON entries(user_id, kind, date DESC);

    CREATE TABLE IF NOT EXISTS gpt_usage (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date    TEXT NOT NULL,
      count   INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (user_id, date)
    );
  `);

  // Additive migrations for subscription tier columns.
  // ADD COLUMN IF NOT EXISTS requires SQLite 3.35+ (better-sqlite3 ships 3.44+).
  // If somehow the SQLite version is too old, throw a clear startup error.
  try {
    instance.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free'");
    instance.exec("ALTER TABLE users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('IF NOT EXISTS')) {
      throw new Error('SQLite version too old to run migrations. Requires 3.35+.');
    }
    throw err;
  }

  return instance;
}
