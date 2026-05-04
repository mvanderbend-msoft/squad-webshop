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

// schema.sql is forward-only and uses IF NOT EXISTS for every statement, so it is
// safe to apply on every startup — this also acts as the migration mechanism for
// new tables (e.g. favorites) on databases that already contain data.
const schemaPath = join(__dirname, 'schema.sql');
const schema = readFileSync(schemaPath, 'utf-8');
db.exec(schema);
console.log(isNew ? '[db] Schema applied.' : '[db] Schema verified.');

seedIfEmpty(db);

export { db };
