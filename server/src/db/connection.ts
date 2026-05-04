import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { seedIfEmpty } from './seed.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve data directory relative to this file's location (src/db → go up to server/)
const serverRoot = join(__dirname, '..', '..');
const dataDir = join(serverRoot, 'data');
// Allow tests to redirect the DB to an isolated location via SQUAD_DB_PATH.
const dbPath = process.env.SQUAD_DB_PATH ?? join(dataDir, 'webshop.db');

if (!process.env.SQUAD_DB_PATH) {
  mkdirSync(dataDir, { recursive: true });
} else {
  mkdirSync(dirname(dbPath), { recursive: true });
}

const isNew = !existsSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Always apply schema — all statements use CREATE TABLE/INDEX IF NOT EXISTS,
// so this acts as a forward-only migration for both fresh and existing DBs.
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);
if (isNew) {
  console.log('[db] Schema applied.');
}

seedIfEmpty(db);

export { db };
