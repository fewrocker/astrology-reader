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
  `);

  // Additive migrations — safe to run on existing databases
  // SQLite does not support ALTER TABLE ADD COLUMN IF NOT EXISTS, so we catch
  // the "duplicate column" error that fires if the column already exists.
  const addColumnIfMissing = (sql: string) => {
    try {
      instance!.exec(sql);
    } catch (err: unknown) {
      // Ignore "duplicate column name" errors — column already exists
      if (!(err instanceof Error && err.message.includes('duplicate column name'))) {
        throw err;
      }
    }
  };

  addColumnIfMissing("ALTER TABLE users ADD COLUMN subscription_tier TEXT DEFAULT 'free'");
  addColumnIfMissing('ALTER TABLE users ADD COLUMN stripe_customer_id TEXT');

  return instance;
}
