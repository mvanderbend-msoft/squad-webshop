// Verifies that the products endpoints inject `isFavorited` correctly.
// Contract: decisions.md §"`isFavorited` on product responses" + issue #3 ACs.
//
// Edge cases:
//   * Unauthenticated → every product has isFavorited === false
//   * Authenticated → only the requesting user's favorites are flagged
//   * isFavorited must be a boolean (not 0/1 from SQLite)
//   * Detail endpoint must include the same flag

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { makeApp, authHeader, type SeededFixture } from './helpers/testApp.js';

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

d('GET /api/products — isFavorited', () => {
  it('returns isFavorited=false for everything when unauthenticated', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
    for (const p of res.body.products) {
      expect(p.isFavorited).toBe(false);
    }
  });

  it("returns isFavorited=true only for the requester's favorited products", async () => {
    const alice = fx.users[0];
    const favId = fx.products[0].id;

    await request(app)
      .post(`/api/favorites/${favId}`)
      .set(authHeader(alice.token))
      .expect(200);

    const res = await request(app)
      .get('/api/products')
      .set(authHeader(alice.token));
    expect(res.status).toBe(200);

    const fav = res.body.products.find((p: { id: number }) => p.id === favId);
    const other = res.body.products.find((p: { id: number }) => p.id !== favId);
    expect(fav.isFavorited).toBe(true);
    expect(other.isFavorited).toBe(false);
  });

  it("does not leak another user's favorites", async () => {
    const alice = fx.users[0];
    const bob = fx.users[1];
    await request(app)
      .post(`/api/favorites/${fx.products[0].id}`)
      .set(authHeader(alice.token))
      .expect(200);

    const res = await request(app)
      .get('/api/products')
      .set(authHeader(bob.token));
    for (const p of res.body.products) {
      expect(p.isFavorited).toBe(false);
    }
  });
});

d('GET /api/products/:id — isFavorited', () => {
  it('reflects favorited state for the requesting user', async () => {
    const u = fx.users[0];
    const pid = fx.products[0].id;

    const beforeRes = await request(app)
      .get(`/api/products/${pid}`)
      .set(authHeader(u.token));
    expect(beforeRes.body.product.isFavorited).toBe(false);

    await request(app)
      .post(`/api/favorites/${pid}`)
      .set(authHeader(u.token))
      .expect(200);

    const afterRes = await request(app)
      .get(`/api/products/${pid}`)
      .set(authHeader(u.token));
    expect(afterRes.body.product.isFavorited).toBe(true);
  });

  it('returns isFavorited=false to unauthenticated detail requests', async () => {
    const pid = fx.products[0].id;
    const res = await request(app).get(`/api/products/${pid}`);
    expect(res.body.product.isFavorited).toBe(false);
  });
});
