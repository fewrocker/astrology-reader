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

  // Apply OAuth migration if not already applied
  // SQLite does not support ALTER COLUMN, so we recreate the table inside a transaction
  const cols = (instance.pragma('table_info(users)') as Array<{ name: string }>).map(c => c.name);
  if (!cols.includes('oauth_provider')) {
    instance.exec(`
      BEGIN;
      CREATE TABLE users_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        oauth_provider TEXT,
        oauth_subject TEXT,
        full_name TEXT,
        birth_date TEXT,
        birth_time TEXT,
        birth_place TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        CHECK (password_hash IS NOT NULL OR (oauth_provider IS NOT NULL AND oauth_subject IS NOT NULL))
      );
      INSERT INTO users_new (id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at)
        SELECT id, email, password_hash, full_name, birth_date, birth_time, birth_place, created_at FROM users;
      DROP TABLE users;
      ALTER TABLE users_new RENAME TO users;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_oauth ON users(oauth_provider, oauth_subject) WHERE oauth_provider IS NOT NULL;
      COMMIT;
    `);
  }

  return instance;
}
