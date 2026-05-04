import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';

// Use an in-memory SQLite database for tests. Must be set BEFORE importing the
// app (which transitively imports the db connection module).
process.env.SQLITE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';

const { app } = await import('../app.js');
const { db } = await import('../db/connection.js');

interface RegisterResponse {
  token: string;
  user: { id: number; email: string; name: string };
}

async function registerUser(email: string): Promise<RegisterResponse> {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ email, password: 'password123', name: 'Test User' });
  expect(res.status).toBe(201);
  return res.body as RegisterResponse;
}

function getSeededProductIds(): number[] {
  const rows = db.prepare('SELECT id FROM products ORDER BY id').all() as { id: number }[];
  return rows.map((r) => r.id);
}

describe('Favorites API', () => {
  let token: string;
  let productIds: number[];

  beforeAll(async () => {
    productIds = getSeededProductIds();
    expect(productIds.length).toBeGreaterThan(1);
    const reg = await registerUser('favtest@example.com');
    token = reg.token;
  });

  describe('GET /api/favorites', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/favorites');
      expect(res.status).toBe(401);
    });

    it('returns empty array for new authenticated user', async () => {
      const reg = await registerUser('empty@example.com');
      const res = await request(app)
        .get('/api/favorites')
        .set('Authorization', `Bearer ${reg.token}`);
      expect(res.status).toBe(200);
      expect(res.body.favorites).toEqual([]);
    });
  });

  describe('POST /api/favorites/:productId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post(`/api/favorites/${productIds[0]}`);
      expect(res.status).toBe(401);
    });

    it('adds favorite and returns { isFavorited: true }', async () => {
      const res = await request(app)
        .post(`/api/favorites/${productIds[0]}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isFavorited: true });
    });

    it('is idempotent — calling twice returns 200', async () => {
      const res1 = await request(app)
        .post(`/api/favorites/${productIds[1]}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res1.status).toBe(200);
      const res2 = await request(app)
        .post(`/api/favorites/${productIds[1]}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res2.status).toBe(200);
      expect(res2.body).toEqual({ isFavorited: true });
    });

    it('returns 404 for non-existent product', async () => {
      const res = await request(app)
        .post('/api/favorites/999999')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/favorites/:productId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete(`/api/favorites/${productIds[0]}`);
      expect(res.status).toBe(401);
    });

    it('removes favorite and returns { isFavorited: false }', async () => {
      // First make sure productIds[0] is favorited.
      await request(app)
        .post(`/api/favorites/${productIds[0]}`)
        .set('Authorization', `Bearer ${token}`);

      const res = await request(app)
        .delete(`/api/favorites/${productIds[0]}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isFavorited: false });
    });

    it('is idempotent — deleting non-existent favorite returns 200', async () => {
      const res = await request(app)
        .delete(`/api/favorites/${productIds[2]}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ isFavorited: false });
    });
  });

  describe('GET /api/products isFavorited injection', () => {
    it('includes isFavorited; true for favorited products of authed user, false otherwise', async () => {
      const reg = await registerUser('inject@example.com');
      const favProductId = productIds[3];

      await request(app)
        .post(`/api/favorites/${favProductId}`)
        .set('Authorization', `Bearer ${reg.token}`);

      const res = await request(app)
        .get('/api/products')
        .set('Authorization', `Bearer ${reg.token}`);
      expect(res.status).toBe(200);
      const products = res.body.products as { id: number; isFavorited: boolean }[];
      expect(products.length).toBeGreaterThan(0);
      for (const p of products) {
        expect(p).toHaveProperty('isFavorited');
        if (p.id === favProductId) {
          expect(p.isFavorited).toBe(true);
        } else {
          expect(p.isFavorited).toBe(false);
        }
      }
    });

    it('GET /api/products/:id includes isFavorited field', async () => {
      const reg = await registerUser('detail@example.com');
      const favProductId = productIds[4];

      await request(app)
        .post(`/api/favorites/${favProductId}`)
        .set('Authorization', `Bearer ${reg.token}`);

      const favRes = await request(app)
        .get(`/api/products/${favProductId}`)
        .set('Authorization', `Bearer ${reg.token}`);
      expect(favRes.status).toBe(200);
      expect(favRes.body.product).toHaveProperty('isFavorited', true);

      const otherRes = await request(app)
        .get(`/api/products/${productIds[5]}`)
        .set('Authorization', `Bearer ${reg.token}`);
      expect(otherRes.status).toBe(200);
      expect(otherRes.body.product).toHaveProperty('isFavorited', false);
    });

    it('unauthenticated GET /api/products returns isFavorited: false on all products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      const products = res.body.products as { isFavorited: boolean }[];
      expect(products.length).toBeGreaterThan(0);
      for (const p of products) {
        expect(p.isFavorited).toBe(false);
      }
    });
  });
});
