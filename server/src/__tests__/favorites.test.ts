import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { Express } from 'express';

// IMPORTANT: SQUAD_DB_PATH must be set before importing the app, because
// connection.ts reads it at module load time.
const tmpDir = mkdtempSync(join(tmpdir(), 'squad-favtest-'));
process.env.SQUAD_DB_PATH = join(tmpDir, 'test.db');
process.env.JWT_SECRET = 'test-secret';

let app: Express;
let db: {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    get: (...params: unknown[]) => unknown;
    all: (...params: unknown[]) => unknown[];
    run: (...params: unknown[]) => unknown;
  };
};
let request: typeof import('supertest').default;

before(async () => {
  request = (await import('supertest')).default;
  const mod = await import('../index.js');
  app = mod.createApp();
  const conn = await import('../db/connection.js');
  db = conn.db as typeof db;
});

interface AuthedUser {
  token: string;
  id: number;
  email: string;
}

async function registerUser(
  email: string,
  password = 'password123',
  name = 'Test User'
): Promise<AuthedUser> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password, name });
  assert.equal(res.status, 201);
  return { token: res.body.token, id: res.body.user.id, email: res.body.user.email };
}

function authHeader(user: AuthedUser): { Authorization: string } {
  return { Authorization: `Bearer ${user.token}` };
}

beforeEach(() => {
  // Clean per-test state without dropping the schema/seed.
  db.exec('DELETE FROM favorites');
  db.exec('DELETE FROM cart_items');
  db.exec('DELETE FROM order_items');
  db.exec('DELETE FROM orders');
  db.exec('DELETE FROM users');
});

function getFirstProductId(): number {
  const row = db.prepare('SELECT id FROM products ORDER BY id LIMIT 1').get() as { id: number };
  return row.id;
}

function getSecondProductId(): number {
  const row = db
    .prepare('SELECT id FROM products ORDER BY id LIMIT 1 OFFSET 1')
    .get() as { id: number };
  return row.id;
}

test('GET /api/favorites — 401 without auth token', async () => {
  const res = await request(app).get('/api/favorites');
  assert.equal(res.status, 401);
});

test('GET /api/favorites — 401 with malformed token', async () => {
  const res = await request(app)
    .get('/api/favorites')
    .set('Authorization', 'Bearer not-a-token');
  assert.equal(res.status, 401);
});

test('GET /api/favorites — empty array for user with no favorites', async () => {
  const user = await registerUser('empty@example.com');
  const res = await request(app).get('/api/favorites').set(authHeader(user));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { favorites: [] });
});

test('GET /api/favorites — full product objects for favorited items', async () => {
  const user = await registerUser('full@example.com');
  const productId = getFirstProductId();
  await request(app).post(`/api/favorites/${productId}`).set(authHeader(user));

  const res = await request(app).get('/api/favorites').set(authHeader(user));
  assert.equal(res.status, 200);
  assert.equal(res.body.favorites.length, 1);
  const fav = res.body.favorites[0];
  assert.equal(fav.id, productId);
  assert.equal(fav.isFavorited, true);
  assert.ok(typeof fav.name === 'string');
  assert.ok(typeof fav.description === 'string');
  assert.ok(typeof fav.price_cents === 'number');
  assert.ok(typeof fav.image_url === 'string');
  assert.ok(typeof fav.stock === 'number');
  assert.ok(typeof fav.category.slug === 'string');
  assert.ok(typeof fav.category.name === 'string');
});

test("GET /api/favorites — only returns the calling user's favorites", async () => {
  const alice = await registerUser('alice@example.com');
  const bob = await registerUser('bob@example.com');
  const aliceFav = getFirstProductId();
  const bobFav = getSecondProductId();
  await request(app).post(`/api/favorites/${aliceFav}`).set(authHeader(alice));
  await request(app).post(`/api/favorites/${bobFav}`).set(authHeader(bob));

  const aliceList = await request(app).get('/api/favorites').set(authHeader(alice));
  assert.deepEqual(
    aliceList.body.favorites.map((f: { id: number }) => f.id),
    [aliceFav]
  );

  const bobList = await request(app).get('/api/favorites').set(authHeader(bob));
  assert.deepEqual(
    bobList.body.favorites.map((f: { id: number }) => f.id),
    [bobFav]
  );
});

test('POST /api/favorites/:productId — 401 without auth', async () => {
  const res = await request(app).post('/api/favorites/1');
  assert.equal(res.status, 401);
});

test('POST /api/favorites/:productId — 200 + isFavorited:true on success', async () => {
  const user = await registerUser('post@example.com');
  const pid = getFirstProductId();
  const res = await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { isFavorited: true });
});

test('POST /api/favorites/:productId — idempotent', async () => {
  const user = await registerUser('idem@example.com');
  const pid = getFirstProductId();
  const first = await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  assert.equal(first.status, 200);
  const second = await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  assert.equal(second.status, 200);
  assert.deepEqual(second.body, { isFavorited: true });

  const count = db
    .prepare('SELECT COUNT(*) as c FROM favorites WHERE user_id = ? AND product_id = ?')
    .get(user.id, pid) as { c: number };
  assert.equal(count.c, 1);
});

test('POST /api/favorites/:productId — 404 for non-existent product', async () => {
  const user = await registerUser('notfound@example.com');
  const res = await request(app).post('/api/favorites/9999999').set(authHeader(user));
  assert.equal(res.status, 404);
});

test('POST /api/favorites/:productId — 400 for non-numeric productId', async () => {
  const user = await registerUser('badid@example.com');
  const res = await request(app).post('/api/favorites/abc').set(authHeader(user));
  assert.equal(res.status, 400);
});

test('DELETE /api/favorites/:productId — 401 without auth', async () => {
  const res = await request(app).delete('/api/favorites/1');
  assert.equal(res.status, 401);
});

test('DELETE /api/favorites/:productId — 200 + isFavorited:false on success', async () => {
  const user = await registerUser('delete@example.com');
  const pid = getFirstProductId();
  await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  const res = await request(app).delete(`/api/favorites/${pid}`).set(authHeader(user));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { isFavorited: false });
});

test('DELETE /api/favorites/:productId — idempotent (delete non-favorited)', async () => {
  const user = await registerUser('idemdel@example.com');
  const pid = getFirstProductId();
  const res = await request(app).delete(`/api/favorites/${pid}`).set(authHeader(user));
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { isFavorited: false });
});

test('DELETE /api/favorites/:productId — actually removes the row', async () => {
  const user = await registerUser('deleted@example.com');
  const pid = getFirstProductId();
  await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  await request(app).delete(`/api/favorites/${pid}`).set(authHeader(user));
  const row = db
    .prepare('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?')
    .get(user.id, pid);
  assert.equal(row, undefined);
});

test('GET /api/products — isFavorited:false on every product when unauthenticated', async () => {
  const res = await request(app).get('/api/products');
  assert.equal(res.status, 200);
  assert.ok(res.body.products.length > 0);
  for (const p of res.body.products) {
    assert.equal(p.isFavorited, false);
  }
});

test('GET /api/products — isFavorited:true for favorited products (authed)', async () => {
  const user = await registerUser('inject@example.com');
  const favId = getFirstProductId();
  const otherId = getSecondProductId();
  await request(app).post(`/api/favorites/${favId}`).set(authHeader(user));

  const res = await request(app).get('/api/products').set(authHeader(user));
  assert.equal(res.status, 200);
  const byId = new Map<number, { isFavorited: boolean }>();
  for (const p of res.body.products) byId.set(p.id, p);
  assert.equal(byId.get(favId)?.isFavorited, true);
  assert.equal(byId.get(otherId)?.isFavorited, false);
});

test('GET /api/products/:id — isFavorited:false when unauthenticated', async () => {
  const pid = getFirstProductId();
  const res = await request(app).get(`/api/products/${pid}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.product.isFavorited, false);
});

test('GET /api/products/:id — isFavorited:true when authed user has favorited', async () => {
  const user = await registerUser('detail@example.com');
  const pid = getFirstProductId();
  await request(app).post(`/api/favorites/${pid}`).set(authHeader(user));
  const res = await request(app).get(`/api/products/${pid}`).set(authHeader(user));
  assert.equal(res.status, 200);
  assert.equal(res.body.product.isFavorited, true);
});

test('GET /api/products/:id — isFavorited:false when authed user has not favorited', async () => {
  const user = await registerUser('detail2@example.com');
  const pid = getFirstProductId();
  const res = await request(app).get(`/api/products/${pid}`).set(authHeader(user));
  assert.equal(res.status, 200);
  assert.equal(res.body.product.isFavorited, false);
});

after(() => {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});
