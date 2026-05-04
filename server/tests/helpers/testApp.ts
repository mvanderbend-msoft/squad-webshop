// Test app factory.
//
// Saul (Tester): these tests are written against the documented contract in
// .squad/decisions.md. They assume Rusty (#3) extracts an Express app factory
// `createApp(db)` so we can inject an in-memory SQLite handle. If the import
// below fails until that refactor lands, that is the point of the draft PR —
// it pins the testing seam.
//
// Expected seam (proposed in .squad/decisions/inbox/saul-favorites-tests.md):
//   server/src/app.ts → export function createApp(db: DatabaseSync): Express;
//
// The factory must mount: /api/auth, /api/products, /api/categories, /api/cart,
// /api/orders, /api/favorites — all reading from the injected `db`.

import type { DatabaseSync as DatabaseSyncType } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Express } from 'express';

// node:sqlite is a built-in (Node ≥ 22.5). Vite's transform pipeline can't
// statically resolve it, so we load it via createRequire which goes through
// Node's resolver instead.
const requireFromHere = createRequire(import.meta.url);
type SqliteModule = typeof import('node:sqlite');
const { DatabaseSync } = requireFromHere('node:sqlite') as SqliteModule;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const FAVORITES_DDL = `
CREATE TABLE IF NOT EXISTS favorites (
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
`;

export async function buildInMemoryDb(): Promise<DatabaseSyncType> {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');

  const schemaPath = join(__dirname, '..', '..', 'src', 'db', 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
  // Favorites table — moves into schema.sql once #2 lands; kept here so
  // tests are self-contained against the contract today.
  db.exec(FAVORITES_DDL);

  return db;
}

export interface SeededFixture {
  db: DatabaseSyncType;
  users: { id: number; email: string; token: string }[];
  products: { id: number; name: string }[];
  categoryId: number;
}

export async function seedBasicFixture(db: DatabaseSyncType): Promise<SeededFixture> {
  const cat = db
    .prepare("INSERT INTO categories (slug, name) VALUES ('test-cat', 'Test Cat')")
    .run();
  const categoryId = Number(cat.lastInsertRowid);

  const insertProduct = db.prepare(
    `INSERT INTO products (name, description, price_cents, image_url, category_id, stock)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const products = [1, 2, 3].map((i) => {
    const r = insertProduct.run(
      `Product ${i}`,
      `Desc ${i}`,
      1000 * i,
      `https://example.com/${i}.jpg`,
      categoryId,
      10
    );
    return { id: Number(r.lastInsertRowid), name: `Product ${i}` };
  });

  const hash = await bcrypt.hash('password123', 4); // low cost for test speed
  const insertUser = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  );
  const users = ['alice', 'bob'].map((email) => {
    const r = insertUser.run(`${email}@test.local`, hash, email);
    const id = Number(r.lastInsertRowid);
    const token = jwt.sign({ id, email: `${email}@test.local` }, JWT_SECRET, {
      expiresIn: '7d',
    });
    return { id, email: `${email}@test.local`, token };
  });

  return { db, users, products, categoryId };
}

export async function makeApp(): Promise<{ app: Express; fixture: SeededFixture }> {
  const db = await buildInMemoryDb();
  const fixture = await seedBasicFixture(db);

  // Dynamic import — this assumes `createApp(db)` is exported from src/app.ts
  // by Rusty's #3 work. Until then, this throws and the API tests are pending.
  const mod = (await import('../../src/app.js')) as {
    createApp: (db: DatabaseSyncType) => Express;
  };
  const app = mod.createApp(db);
  return { app, fixture };
}

export function authHeader(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}
