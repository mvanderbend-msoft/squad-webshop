import { Router } from 'express';
import { db } from '../db/connection.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

interface CartItemRow {
  id: number;
  user_id: number;
  product_id: number;
  quantity: number;
  product_name: string;
  product_description: string;
  product_price_cents: number;
  product_image_url: string;
  product_stock: number;
  category_id: number;
  category_slug: string;
  category_name: string;
}

function getCartItems(userId: number) {
  const rows = db
    .prepare(
      `SELECT
        ci.id, ci.user_id, ci.product_id, ci.quantity,
        p.name AS product_name,
        p.description AS product_description,
        p.price_cents AS product_price_cents,
        p.image_url AS product_image_url,
        p.stock AS product_stock,
        c.id AS category_id,
        c.slug AS category_slug,
        c.name AS category_name
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      JOIN categories c ON p.category_id = c.id
      WHERE ci.user_id = ?
      ORDER BY ci.id`
    )
    .all(userId) as CartItemRow[];

  const items = rows.map((r) => ({
    id: r.id,
    quantity: r.quantity,
    line_total_cents: r.quantity * r.product_price_cents,
    product: {
      id: r.product_id,
      name: r.product_name,
      description: r.product_description,
      price_cents: r.product_price_cents,
      image_url: r.product_image_url,
      stock: r.product_stock,
      category: { id: r.category_id, slug: r.category_slug, name: r.category_name },
    },
  }));

  const total_cents = items.reduce((sum, i) => sum + i.line_total_cents, 0);
  return { items, total_cents };
}

// GET /api/cart
router.get('/', (req, res) => {
  const cart = getCartItems(req.user!.id);
  res.json(cart);
});

// POST /api/cart
router.post('/', (req, res) => {
  const { product_id, quantity } = req.body ?? {};
  if (!product_id || !quantity || typeof product_id !== 'number' || typeof quantity !== 'number') {
    res.status(400).json({ error: 'product_id (number) and quantity (number) are required' });
    return;
  }
  if (quantity <= 0) {
    res.status(400).json({ error: 'quantity must be greater than 0' });
    return;
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(product_id);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // Upsert: if exists, add to quantity; otherwise insert
  const existing = db
    .prepare('SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?')
    .get(req.user!.id, product_id) as { id: number; quantity: number } | undefined;

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(
      existing.quantity + quantity,
      existing.id
    );
  } else {
    db.prepare('INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)').run(
      req.user!.id,
      product_id,
      quantity
    );
  }

  res.status(201).json(getCartItems(req.user!.id));
});

// PATCH /api/cart/:itemId
router.patch('/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  const { quantity } = req.body ?? {};

  if (isNaN(itemId)) {
    res.status(400).json({ error: 'Invalid item id' });
    return;
  }
  if (typeof quantity !== 'number') {
    res.status(400).json({ error: 'quantity (number) is required' });
    return;
  }

  const item = db
    .prepare('SELECT id FROM cart_items WHERE id = ? AND user_id = ?')
    .get(itemId, req.user!.id);
  if (!item) {
    res.status(404).json({ error: 'Cart item not found' });
    return;
  }

  if (quantity <= 0) {
    db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(quantity, itemId);
  }

  res.json(getCartItems(req.user!.id));
});

// DELETE /api/cart/:itemId
router.delete('/:itemId', (req, res) => {
  const itemId = parseInt(req.params.itemId, 10);
  if (isNaN(itemId)) {
    res.status(400).json({ error: 'Invalid item id' });
    return;
  }

  const item = db
    .prepare('SELECT id FROM cart_items WHERE id = ? AND user_id = ?')
    .get(itemId, req.user!.id);
  if (!item) {
    res.status(404).json({ error: 'Cart item not found' });
    return;
  }

  db.prepare('DELETE FROM cart_items WHERE id = ?').run(itemId);
  res.json(getCartItems(req.user!.id));
});

// DELETE /api/cart
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.id);
  res.json({ items: [], total_cents: 0 });
});

export default router;
