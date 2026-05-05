import { Router } from 'express';
import { db } from '../db/connection.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

interface ProductRow {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  stock: number;
  category_id: number;
  category_slug: string;
  category_name: string;
}

function shapeProduct(r: ProductRow) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    price_cents: r.price_cents,
    image_url: r.image_url,
    stock: r.stock,
    category: { id: r.category_id, slug: r.category_slug, name: r.category_name },
  };
}

// GET /api/favorites — list favorited products for the authenticated user
router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT p.id, p.name, p.description, p.price_cents, p.image_url, p.stock,
              c.id AS category_id, c.slug AS category_slug, c.name AS category_name
         FROM favorites f
         JOIN products p ON p.id = f.product_id
         JOIN categories c ON c.id = p.category_id
        WHERE f.user_id = ?
        ORDER BY f.created_at DESC, p.id DESC`
    )
    .all(req.user!.id) as ProductRow[];

  res.json({ favorites: rows.map(shapeProduct) });
});

// POST /api/favorites/:productId — add to favorites (idempotent)
router.post('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(productId);
  if (!product) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  // INSERT OR IGNORE makes this idempotent: a second POST is a no-op (still 200).
  db.prepare('INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)').run(
    req.user!.id,
    productId
  );

  res.status(200).json({ isFavorited: true });
});

// DELETE /api/favorites/:productId — remove from favorites (idempotent)
router.delete('/:productId', (req, res) => {
  const productId = parseInt(req.params.productId, 10);
  if (isNaN(productId)) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }

  // Idempotent: deleting a non-existent favorite still returns 200.
  // We do not 404 if the product itself is missing — the user's state
  // ("not favorited") is the same either way.
  db.prepare('DELETE FROM favorites WHERE user_id = ? AND product_id = ?').run(
    req.user!.id,
    productId
  );

  res.status(200).json({ isFavorited: false });
});

export default router;
