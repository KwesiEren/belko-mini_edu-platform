import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import pino from 'pino';

const logger = pino({ name: 'database' });

let db: Database.Database | null = null;

function getElectronApp() {
  try {
    return require('electron').app;
  } catch {
    return null;
  }
}

export function getDatabasePath(): string {
  const electronApp = getElectronApp();
  let userDataPath: string;

  if (electronApp) {
    userDataPath = electronApp.getPath('userData');
  } else {
    // Fallback for CLI scripts - use current working directory or env var
    userDataPath = process.env.BELKO_DATA_DIR || path.join(process.cwd(), 'data');
  }

  const dbDir = path.join(userDataPath, 'database');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  return path.join(dbDir, 'belko.db');
}

export function initializeDatabase(): Database.Database {
  if (db) return db;

  const dbPath = getDatabasePath();
  logger.info({ dbPath }, 'Initializing database');

  db = new Database(dbPath, {
    verbose: process.env.NODE_ENV === 'development' ? logger.debug.bind(logger) : undefined,
  });

  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('foreign_keys = ON');
  db.pragma('temp_store = MEMORY');
  db.pragma('cache_size = -32768');

  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      checksum TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    logger.info('Database closed');
  }
}

export function runInTransaction<T>(fn: () => T): T {
  const database = getDatabase();
  const transaction = database.transaction(fn);
  return transaction();
}