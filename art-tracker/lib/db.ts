import { createClient } from '@libsql/client';

let client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error('TURSO_DATABASE_URL environment variable is not set');
    }

    client = createClient({ url, authToken });
  }
  return client;
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    artist TEXT,
    year_created TEXT,
    medium TEXT,
    dimensions TEXT,
    current_location TEXT,
    quantity INTEGER NOT NULL DEFAULT 1,
    price_paid REAL,
    date_acquired TEXT,
    notes TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sold_gifted (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    year_created TEXT,
    medium TEXT,
    dimensions TEXT,
    recipient_name TEXT NOT NULL,
    recipient_contact TEXT,
    type TEXT NOT NULL,
    price_received REAL,
    date TEXT,
    notes TEXT,
    image_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );
`;

let schemaInitialized = false;

export async function getDb() {
  const db = getClient();
  if (!schemaInitialized) {
    // Run each statement separately (libSQL doesn't support multi-statement exec)
    for (const stmt of SCHEMA.split(';').map((s) => s.trim()).filter(Boolean)) {
      await db.execute(stmt);
    }
    // Migration: add quantity column to existing databases that predate it
    await db.execute(
      `ALTER TABLE artworks ADD COLUMN quantity INTEGER NOT NULL DEFAULT 1`
    ).catch(() => { /* column already exists — safe to ignore */ });
    schemaInitialized = true;
  }
  return db;
}
