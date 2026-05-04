/**
 * Integration tests for the favorites feature (issue #17).
 *
 * Covers:
 *  - Favorites CRUD endpoints (#12): GET /api/favorites, POST/DELETE /api/favorites/:productId
 *  - isFavorited injection on product responses (#13): GET /api/products, GET /api/products/:id
 *
 * NOTE (TDD posture): At the time these tests were written, the favorites router
 * (#12) and the isFavorited injection (#13) had not yet landed on `main`. Tests
 * are written against the documented contract (issues #12, #13 + .squad/decisions.md
 * "Favorites Feature Decomposition"). They will fail until the impl PRs merge —
 * that is the intended behavior.
 *
 * Database isolation: vi.mock replaces the shared file-backed SQLite connection
 * with a fresh in-memory DatabaseSync per test run. The favorites table is created
 * inline below to match the documented contract from issue #11.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import express, { type Express } from 'express';
import request from 'supertest';

// Mock the db module BEFORE importing any router. vi.mock is hoisted, so the
// factory runs before the static imports below resolve.
vi.mock('../db/connection.js', async () => {
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  return { db };
});

// Re-import the (now-mocked) db handle so the test owns the same instance the
// routers see.
const { db } = await import('../db/connection.js');

// Routers under test. The favorites router import will fail until #12 lands —
// that's expected. Once it lands, the import path here must match the impl.
const { default: authRouter } = await import('../routes/auth.js');
const { default: productsRouter } = await import('../routes/products.js');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let favoritesRouter: any;
try {
  favoritesRouter = (await import('../routes/favorites.js')).default;
} catch {
  // Leave undefined — the favorites describe-block will fail loudly with a
  // clear "favorites router not implemented" message rather than a cryptic
  // module-not-found at suite load time.
  favoritesRouter = null;
}

function buildApp(): Express {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  if (favoritesRouter) {
    app.use('/api/favorites', favoritesRouter);
  }
  return app;
}

const app = buildApp();

// --- Schema setup (mirrors server/src/db/schema.sql + favorites migration #11) ---
function applySchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price_cents INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      category_id INTEGER NOT NULL REFERENCES categories(id),
      stock INTEGER NOT NULL DEFAULT 100
    );
    -- favorites table per issue #11 + decisions.md ("composite PK as sole
    -- idempotency mechanism").
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, product_id)
    );
  `);
}

function resetDb(): void {
  db.exec(`
    DELETE FROM favorites;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM users;
  `);
}

function seedCategoryAndProducts(): { categoryId: number; productIds: number[] } {
  const cat = db
    .prepare("INSERT INTO categories (slug, name) VALUES ('test', 'Test') RETURNING id")
    .get() as { id: number };
  const insertProduct = db.prepare(
    `INSERT INTO products (name, description, price_cents, image_url, category_id, stock)
     VALUES (?, ?, ?, ?, ?, ?) RETURNING id`
  );
  const p1 = insertProduct.get('Widget', 'A widget', 1000, 'http://img/1', cat.id, 10) as {
    id: number;
  };
  const p2 = insertProduct.get('Gadget', 'A gadget', 2500, 'http://img/2', cat.id, 5) as {
    id: number;
  };
  const p3 = insertProduct.get('Gizmo', 'A gizmo', 500, 'http://img/3', cat.id, 0) as {
    id: number;
  };
  return { categoryId: cat.id, productIds: [p1.id, p2.id, p3.id] };
}

async function registerUser(
  email = `u${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
): Promise<{ token: string; userId: number; email: string }> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'secret123', name: 'Test User' });
  expect(res.status).toBe(201);
  return { token: res.body.token, userId: res.body.user.id, email: res.body.user.email };
}

beforeAll(() => {
  applySchema();
});

beforeEach(() => {
  resetDb();
});

afterAll(() => {
  db.close();
});

// =============================================================================
// GET /api/favorites
// =============================================================================
describe('GET /api/favorites', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed Authorization header', async () => {
    const res = await request(app).get('/api/favorites').set('Authorization', 'Bogus xyz');
    expect(res.status).toBe(401);
  });

  it('returns 401 with an invalid/expired token', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });

  it('returns an empty array for a user with no favorites', async () => {
    seedCategoryAndProducts();
    const { token } = await registerUser();
    const res = await request(app).get('/api/favorites').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Accept either { favorites: [] } or { products: [] } depending on impl;
    // require an array under one of the two contract-documented keys.
    const list = res.body.favorites ?? res.body.products;
    expect(Array.isArray(list)).toBe(true);
    expect(list).toEqual([]);
  });

  it('returns full product objects for favorited items (not just ids)', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();

    // Favorite two of the three products.
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .post(`/api/favorites/${productIds[2]}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/favorites').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    const list = res.body.favorites ?? res.body.products;
    expect(Array.isArray(list)).toBe(true);
    expect(list).toHaveLength(2);

    // Each entry must look like a product (id, name, price_cents, category) —
    // not just a bare productId number.
    for (const item of list) {
      expect(item).toMatchObject({
        id: expect.any(Number),
        name: expect.any(String),
        price_cents: expect.any(Number),
      });
      expect(item.category).toBeDefined();
    }
    const returnedIds = list.map((p: { id: number }) => p.id).sort();
    expect(returnedIds).toEqual([productIds[0], productIds[2]].sort());
  });

  it('only returns the calling user’s favorites (no cross-user leakage)', async () => {
    const { productIds } = seedCategoryAndProducts();
    const userA = await registerUser('a@example.com');
    const userB = await registerUser('b@example.com');

    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${userA.token}`);
    await request(app)
      .post(`/api/favorites/${productIds[1]}`)
      .set('Authorization', `Bearer ${userB.token}`);

    const resA = await request(app)
      .get('/api/favorites')
      .set('Authorization', `Bearer ${userA.token}`);
    const listA = resA.body.favorites ?? resA.body.products;
    expect(listA).toHaveLength(1);
    expect(listA[0].id).toBe(productIds[0]);
  });
});

// =============================================================================
// POST /api/favorites/:productId
// =============================================================================
describe('POST /api/favorites/:productId', () => {
  it('returns 401 without auth token', async () => {
    const { productIds } = seedCategoryAndProducts();
    const res = await request(app).post(`/api/favorites/${productIds[0]}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 + { isFavorited: true } on success', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();
    const res = await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isFavorited: true });
  });

  it('actually persists the favorite in the database', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token, userId } = await registerUser();
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    const row = db
      .prepare('SELECT user_id, product_id FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userId, productIds[0]);
    expect(row).toBeDefined();
  });

  it('is idempotent — second POST returns 200, not a constraint error', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token, userId } = await registerUser();

    const first = await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(first.status).toBe(200);

    const second = await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ isFavorited: true });

    // And only one row exists — composite PK enforces idempotency, not duplication.
    const rows = db
      .prepare('SELECT * FROM favorites WHERE user_id = ? AND product_id = ?')
      .all(userId, productIds[0]);
    expect(rows).toHaveLength(1);
  });

  it('returns 404 for a non-existent productId', async () => {
    seedCategoryAndProducts();
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/favorites/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 (or 404) for a non-numeric productId', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/favorites/not-a-number')
      .set('Authorization', `Bearer ${token}`);
    // Either 400 (validation) or 404 (treated as missing) is acceptable;
    // a 5xx or 200 is not.
    expect([400, 404]).toContain(res.status);
  });
});

// =============================================================================
// DELETE /api/favorites/:productId
// =============================================================================
describe('DELETE /api/favorites/:productId', () => {
  it('returns 401 without auth token', async () => {
    const { productIds } = seedCategoryAndProducts();
    const res = await request(app).delete(`/api/favorites/${productIds[0]}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 + { isFavorited: false } on success', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app)
      .delete(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isFavorited: false });
  });

  it('actually removes the favorite from the database', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token, userId } = await registerUser();
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    await request(app)
      .delete(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    const row = db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userId, productIds[0]);
    expect(row).toBeUndefined();
  });

  it('is idempotent — deleting a non-favorited product returns 200', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();
    const res = await request(app)
      .delete(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ isFavorited: false });
  });

  it('does not delete another user’s favorite', async () => {
    const { productIds } = seedCategoryAndProducts();
    const userA = await registerUser('a@example.com');
    const userB = await registerUser('b@example.com');
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${userA.token}`);

    // userB tries to delete userA's favorite — should succeed (200, idempotent
    // for userB) but userA's favorite must still exist.
    await request(app)
      .delete(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${userB.token}`);

    const row = db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(userA.userId, productIds[0]);
    expect(row).toBeDefined();
  });
});

// =============================================================================
// isFavorited injection on product responses (#13)
// =============================================================================
describe('isFavorited injection on /api/products', () => {
  it('GET /api/products includes isFavorited:false for ALL products when unauthed', async () => {
    seedCategoryAndProducts();
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.products)).toBe(true);
    expect(res.body.products.length).toBeGreaterThan(0);
    for (const p of res.body.products) {
      expect(p).toHaveProperty('isFavorited');
      expect(p.isFavorited).toBe(false);
    }
  });

  it('GET /api/products includes isFavorited:true for favorited products when authed', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();
    await request(app)
      .post(`/api/favorites/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);

    const res = await request(app).get('/api/products').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const byId = new Map<number, { isFavorited: boolean }>(
      res.body.products.map((p: { id: number; isFavorited: boolean }) => [p.id, p])
    );
    expect(byId.get(productIds[0])?.isFavorited).toBe(true);
    expect(byId.get(productIds[1])?.isFavorited).toBe(false);
    expect(byId.get(productIds[2])?.isFavorited).toBe(false);
  });

  it('GET /api/products/:id includes isFavorited field (unauthed → false)', async () => {
    const { productIds } = seedCategoryAndProducts();
    const res = await request(app).get(`/api/products/${productIds[0]}`);
    expect(res.status).toBe(200);
    expect(res.body.product).toHaveProperty('isFavorited');
    expect(res.body.product.isFavorited).toBe(false);
  });

  it('GET /api/products/:id reflects favorite state for the authed user', async () => {
    const { productIds } = seedCategoryAndProducts();
    const { token } = await registerUser();
    await request(app)
      .post(`/api/favorites/${productIds[1]}`)
      .set('Authorization', `Bearer ${token}`);

    const favRes = await request(app)
      .get(`/api/products/${productIds[1]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(favRes.status).toBe(200);
    expect(favRes.body.product.isFavorited).toBe(true);

    const notFavRes = await request(app)
      .get(`/api/products/${productIds[0]}`)
      .set('Authorization', `Bearer ${token}`);
    expect(notFavRes.status).toBe(200);
    expect(notFavRes.body.product.isFavorited).toBe(false);
  });

  it('GET /api/products/:id returns 404 for an unknown product (auth optional)', async () => {
    seedCategoryAndProducts();
    const res = await request(app).get('/api/products/999999');
    expect(res.status).toBe(404);
  });
});

// =============================================================================
// Sanity: the favorites router is actually wired up
// =============================================================================
describe('favorites router wiring', () => {
  it('the favorites router module exists and is mounted', () => {
    expect(favoritesRouter).not.toBeNull();
  });
});
