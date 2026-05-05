import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { buildTestApp } from './build-test-app.js';

/**
 * Backend favorites endpoint integration tests (issue #17).
 *
 * Scope (per Ripley's prompt and acceptance criteria for #17):
 *   - auth required (401 unauthenticated)
 *   - happy path (GET list, POST add, DELETE remove)
 *   - idempotency (POST x2, DELETE non-favorited)
 *   - 404 for non-existent productId on POST
 *
 * Out of scope here: GET /api/products `isFavorited` injection. That
 * behaviour is owned by issue #13, which is not present on the parent
 * branch (PR #64 / squad/12-favorites-crud). A follow-up suite will
 * cover it once #13 lands.
 *
 * Isolation: each test run registers a fresh user with a random email,
 * so `favorites` rows are scoped to a never-before-seen user_id and the
 * shared seeded SQLite catalog stays read-only from our perspective.
 */

let app: Express;
let token: string;
let productId: number;
let otherProductId: number;

const NON_EXISTENT_PRODUCT_ID = 9_999_999;

beforeAll(async () => {
  app = buildTestApp();

  const email = `ripley-fav-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
  const register = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'hunter22', name: 'Ripley Test' });
  expect(register.status).toBe(201);
  token = register.body.token as string;
  expect(token).toBeTruthy();

  const products = await request(app).get('/api/products');
  expect(products.status).toBe(200);
  expect(products.body.products.length).toBeGreaterThanOrEqual(2);
  productId = products.body.products[0].id as number;
  otherProductId = products.body.products[1].id as number;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('GET /api/favorites', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('returns an empty list for a user with no favorites', async () => {
    const res = await request(app).get('/api/favorites').set(auth());
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.favorites)).toBe(true);
    expect(res.body.favorites).toEqual([]);
  });

  it('returns full product objects for favorited items', async () => {
    const post = await request(app).post(`/api/favorites/${productId}`).set(auth());
    expect(post.status).toBe(200);

    const res = await request(app).get('/api/favorites').set(auth());
    expect(res.status).toBe(200);
    const list = res.body.favorites as Array<Record<string, unknown>>;
    expect(list.length).toBe(1);
    const fav = list[0];
    expect(fav.id).toBe(productId);
    expect(typeof fav.name).toBe('string');
    expect(typeof fav.price_cents).toBe('number');
    expect(typeof fav.image_url).toBe('string');
    expect(fav.category).toBeTruthy();
  });
});

describe('POST /api/favorites/:productId', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).post(`/api/favorites/${productId}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 + { isFavorited: true } on success', async () => {
    const res = await request(app).post(`/api/favorites/${otherProductId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(true);
  });

  it('is idempotent — second POST for the same product returns 200', async () => {
    // Already favorited above. Second call must not 409 / 500 and state
    // must be unchanged (still exactly one row in the favorites list).
    const res = await request(app).post(`/api/favorites/${otherProductId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(true);

    const list = await request(app).get('/api/favorites').set(auth());
    const items = list.body.favorites as Array<{ id: number }>;
    const matches = items.filter((p) => p.id === otherProductId);
    expect(matches.length).toBe(1);
  });

  it('returns 404 for a non-existent productId', async () => {
    const res = await request(app)
      .post(`/api/favorites/${NON_EXISTENT_PRODUCT_ID}`)
      .set(auth());
    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric productId', async () => {
    const res = await request(app).post('/api/favorites/not-a-number').set(auth());
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/favorites/:productId', () => {
  it('returns 401 without auth token', async () => {
    const res = await request(app).delete(`/api/favorites/${productId}`);
    expect(res.status).toBe(401);
  });

  it('returns 200 + { isFavorited: false } on success and removes it from the list', async () => {
    // productId was favorited in the GET suite. Remove it.
    const res = await request(app).delete(`/api/favorites/${productId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(false);

    const list = await request(app).get('/api/favorites').set(auth());
    const items = list.body.favorites as Array<{ id: number }>;
    expect(items.find((p) => p.id === productId)).toBeUndefined();
  });

  it('is idempotent — deleting an already-non-favorited product returns 200', async () => {
    // productId was just deleted; this is a no-op.
    const res = await request(app).delete(`/api/favorites/${productId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(false);
  });

  it('does not error when DELETEing a non-existent productId (idempotent)', async () => {
    // The endpoint intentionally does not 404 on missing products — the
    // user-facing state ("not favorited") is the same either way.
    const res = await request(app)
      .delete(`/api/favorites/${NON_EXISTENT_PRODUCT_ID}`)
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.isFavorited).toBe(false);
  });
});

describe('cross-user isolation', () => {
  it("a second user's favorites do not leak into the first user's list", async () => {
    const email = `ripley-fav-other-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.local`;
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'hunter22', name: 'Ripley Other' });
    expect(register.status).toBe(201);
    const otherToken = register.body.token as string;

    // Other user favorites productId.
    const post = await request(app)
      .post(`/api/favorites/${productId}`)
      .set({ Authorization: `Bearer ${otherToken}` });
    expect(post.status).toBe(200);

    // First user's list still only contains otherProductId, not productId.
    const list = await request(app).get('/api/favorites').set(auth());
    const items = list.body.favorites as Array<{ id: number }>;
    expect(items.find((p) => p.id === productId)).toBeUndefined();
    expect(items.find((p) => p.id === otherProductId)).toBeDefined();
  });
});
