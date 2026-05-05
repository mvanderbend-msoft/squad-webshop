import express, { type Express } from 'express';
import cors from 'cors';
import { db } from '../db/connection.js';
import authRouter from '../routes/auth.js';
import productsRouter from '../routes/products.js';
import cartRouter from '../routes/cart.js';
import ordersRouter from '../routes/orders.js';
import favoritesRouter from '../routes/favorites.js';

/**
 * Build a fresh Express app instance for tests, mirroring `src/index.ts`
 * but without the `app.listen(...)` side-effect. Lives inside `__tests__/`
 * so this file stays in test scope only — no production code imports it.
 */
export function buildTestApp(): Express {
  const app = express();
  app.use(
    cors({
      origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
    })
  );
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', (_req, res) => {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
    res.json({ categories });
  });
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/favorites', favoritesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  return app;
}
