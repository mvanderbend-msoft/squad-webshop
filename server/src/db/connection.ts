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
const defaultDbPath = join(dataDir, 'webshop.db');

// Allow overriding the SQLite path via env var (used by tests, e.g. ':memory:').
const dbPath = process.env.SQLITE_PATH || defaultDbPath;
const isInMemory = dbPath === ':memory:';

if (!isInMemory) {
  mkdirSync(dataDir, { recursive: true });
}

const isNew = isInMemory || !existsSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// Schema is idempotent (CREATE TABLE/INDEX IF NOT EXISTS), so apply on every
// startup to act as a forward-only migration for new tables/indexes.
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log(isNew ? '[db] Schema applied.' : '[db] Schema applied (idempotent migration).');

seedIfEmpty(db);

export { db };
