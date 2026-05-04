import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedIfEmpty } from './seed.js';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve data directory relative to this file's location (src/db -> go up to server/)
const serverRoot = join(__dirname, '..', '..');
const dataDir = join(serverRoot, 'data');
const dbPath = join(dataDir, 'webshop.db');

mkdirSync(dataDir, { recursive: true });

const isNew = !existsSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

if (isNew) {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  console.log('[db] Schema applied.');
} else {
  // Ensure tables exist even if DB file pre-existed but was empty
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('users','categories')")
    .all() as { name: string }[];
  if (tables.length < 2) {
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    db.exec(schema);
    console.log('[db] Schema applied (existing empty DB).');
  }
}

seedIfEmpty(db);

runMigrations(db);

export { db };