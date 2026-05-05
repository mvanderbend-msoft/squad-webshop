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
const dbPath = join(dataDir, 'webshop.db');

mkdirSync(dataDir, { recursive: true });

const isNew = !existsSync(dbPath);

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

// schema.sql uses CREATE TABLE/INDEX IF NOT EXISTS for every object, so
// applying it on every startup is safe and acts as a forward-only migration
// for existing databases (e.g. picks up newly added tables like `jobs`).
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log(isNew ? '[db] Schema applied.' : '[db] Schema applied (idempotent migration).');

seedIfEmpty(db);

export { db };
