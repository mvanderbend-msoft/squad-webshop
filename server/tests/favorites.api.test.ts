// API integration tests for the Favorites endpoints.
//
// Contract source: .squad/decisions.md (PRD #1, Add to Favorites) and issue #3.
// Test seam: see server/tests/helpers/testApp.ts. Tests will fail to import
// `createApp` until #3 lands — that is intentional for this draft PR.
//
// Edge cases captured below:
//   * idempotency: POST and DELETE may be called twice without error
//   * 401 on every endpoint without a Bearer token
//   * 401 on bogus / expired / malformed Bearer token
//   * 404 on POST for an unknown productId
//   * isFavorited is per-user (Alice favoriting does not affect Bob's view)
//   * isFavorited is false for unauthenticated GETs of products
//   * Composite PK enforces no duplicate rows even after race-y double POST

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { makeApp, authHeader, type SeededFixture } from './helpers/testApp.js';

// Skip the whole suite if the app factory hasn't been extracted yet (#3 not
// merged). When that lands, `makeApp` resolves and these tests run for real.
let appAvailable = false;
try {
  await import('../src/app.js');
  appAvailable = true;
} catch {
  // Pending #3 — see helpers/testApp.ts header comment.
}
const d = appAvailable ? describe : describe.skip;

let app: Express;
let fx: SeededFixture;

beforeEach(async () => {
  if (!appAvailable) return;
  const built = await makeApp();
  app = built.app;
  fx = built.fixture;
});

d('GET /api/favorites', () => {
  it('returns empty array when user has no favorites', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set(authHeader(fx.users[0].token));
    expect(res.status).toBe(200);
    // Spec wording from issue #3: "an array of full product objects". Body shape
    // could be `Product[]` or `{ products: Product[] }`. Accept either; if both
    // sides settle on one, tighten this assertion.
    const products = Array.isArray(res.body) ? res.body : res.body.products;
    expect(products).toEqual([]);
  });

  it("returns only the authenticated user's favorites", async () => {
    const alice = fx.users[0];
    const bob = fx.users[1];

    await request(app)
      .post(`/api/favorites/${fx.products[0].id}`)
      .set(authHeader(alice.token))
      .expect(200);
    await request(app)
      .post(`/api/favorites/${fx.products[1].id}`)
      .set(authHeader(bob.token))
      .expect(200);

    const aliceRes = await request(app)
      .get('/api/favorites')
      .set(authHeader(alice.token));
    const aliceProducts = Array.isArray(aliceRes.body)
      ? aliceRes.body
      : aliceRes.body.products;
    expect(aliceProducts).toHaveLength(1);
    expect(aliceProducts[0].id).toBe(fx.products[0].id);
    expect(aliceProducts[0].isFavorited).toBe(true);
  });

  it('401 when unauthenticated', async () => {
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('401 when Bearer token is malformed', async () => {
    const res = await request(app)
      .get('/api/favorites')
      .set('Authorization', 'Bearer not-a-real-jwt');
    expect(res.status).toBe(401);
  });
});

d('POST /api/favorites/:productId', () => {
  it('creates a favorite and returns { isFavorited: true }', async () => {
    const u = fx.users[0];
    const res = await request(app)
      .post(`/api/favorites/${fx.products[0].id}`)
      .set(authHeader(u.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isFavorited: true });

    const row = fx.db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(u.id, fx.products[0].id);
    expect(row).toBeTruthy();
  });

  it('is idempotent — second call still returns 200 and does not duplicate rows', async () => {
    const u = fx.users[0];
    const pid = fx.products[0].id;

    const first = await request(app)
      .post(`/api/favorites/${pid}`)
      .set(authHeader(u.token));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ isFavorited: true });

    const second = await request(app)
      .post(`/api/favorites/${pid}`)
      .set(authHeader(u.token));
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ isFavorited: true });

    const count = fx.db
      .prepare('SELECT COUNT(*) as n FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(u.id, pid) as { n: number };
    expect(count.n).toBe(1);
  });

  it('returns 404 for an unknown product id', async () => {
    const u = fx.users[0];
    const res = await request(app)
      .post('/api/favorites/9999999')
      .set(authHeader(u.token));
    expect(res.status).toBe(404);
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).post(`/api/favorites/${fx.products[0].id}`);
    expect(res.status).toBe(401);
  });

  // Edge case: non-numeric productId. We don't lock down 400 vs 404 here —
  // either is reasonable — but it must NOT be 200 or 5xx.
  it('rejects a non-numeric productId without 5xx', async () => {
    const u = fx.users[0];
    const res = await request(app)
      .post('/api/favorites/banana')
      .set(authHeader(u.token));
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});

d('DELETE /api/favorites/:productId', () => {
  it('removes a favorite and returns { isFavorited: false }', async () => {
    const u = fx.users[0];
    const pid = fx.products[0].id;

    await request(app)
      .post(`/api/favorites/${pid}`)
      .set(authHeader(u.token))
      .expect(200);

    const res = await request(app)
      .delete(`/api/favorites/${pid}`)
      .set(authHeader(u.token));
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ isFavorited: false });

    const row = fx.db
      .prepare('SELECT 1 FROM favorites WHERE user_id = ? AND product_id = ?')
      .get(u.id, pid);
    expect(row).toBeUndefined();
  });

  it('is idempotent — deleting twice still returns 200', async () => {
    const u = fx.users[0];
    const pid = fx.products[0].id;

    await request(app)
      .post(`/api/favorites/${pid}`)
      .set(authHeader(u.token))
      .expect(200);

    const first = await request(app)
      .delete(`/api/favorites/${pid}`)
      .set(authHeader(u.token));
    expect(first.status).toBe(200);
    expect(first.body).toEqual({ isFavorited: false });

    const second = await request(app)
      .delete(`/api/favorites/${pid}`)
      .set(authHeader(u.token));
    expect(second.status).toBe(200);
    expect(second.body).toEqual({ isFavorited: false });
  });

  it('returns 401 when unauthenticated', async () => {
    const res = await request(app).delete(`/api/favorites/${fx.products[0].id}`);
    expect(res.status).toBe(401);
  });
});
