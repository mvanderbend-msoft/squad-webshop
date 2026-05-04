import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { db } from './db/connection.js';
import authRouter from './routes/auth.js';
import productsRouter from './routes/products.js';
import cartRouter from './routes/cart.js';
import ordersRouter from './routes/orders.js';

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/categories', (_req, res) => {
  // Forward to products router's /categories handler
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json({ categories });
});
app.use('/api/cart', cartRouter);
app.use('/api/orders', ordersRouter);

// 404 fallback
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

const PORT = parseInt(process.env.PORT || '4000', 10);

// DB is already initialized by importing connection.ts (side-effect import)
void db; // ensure module is evaluated

app.listen(PORT, () => {
  console.log(`[server] Squad Webshop API listening on http://localhost:${PORT}`);
});
