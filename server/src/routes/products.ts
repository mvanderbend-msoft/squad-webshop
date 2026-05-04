import { Router } from 'express';
import { db } from '../db/connection.js';
import { authOptional } from '../middleware/auth.js';

const router = Router();

interface ProductRow {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  category_id: number;
  stock: number;
  category_slug: string;
  category_name: string;
  is_favorited: number | null;
}

router.use(authOptional);

// GET /api/categories
router.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json({ categories });
});

// GET /api/products?category=<slug>&q=<search>
router.get('/', (req, res) => {
  const { category, q } = req.query;
  const userId = req.user?.id ?? null;

  let sql = `
    SELECT p.*, c.slug AS category_slug, c.name AS category_name,
           CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS is_favorited
    FROM products p
    JOIN categories c ON p.category_id = c.id
    LEFT JOIN favorites f ON f.product_id = p.id AND f.user_id = ?
    WHERE 1=1
  `;
  const params: unknown[] = [userId];

  if (category && typeof category === 'string') {
    sql += ' AND c.slug = ?';
    params.push(category);
  }

  if (q && typeof q === 'string' && q.trim()) {
    sql += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    const pattern = `%${q.trim()}%`;
    params.push(pattern, pattern);
  }

  sql += ' ORDER BY p.name';

  const rows = db.prepare(sql).all(...params) as ProductRow[];
  const products = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    price_cents: r.price_cents,
    image_url: r.image_url,
    stock: r.stock,
    category: { id: r.category_id, slug: r.category_slug, name: r.category_name },
    isFavorited: r.is_favorited === 1,
  }));
  res.json({ products });
});

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid product id' });
    return;
  }

  const userId = req.user?.id ?? null;

  const row = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name,
              CASE WHEN f.user_id IS NULL THEN 0 ELSE 1 END AS is_favorited
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN favorites f ON f.product_id = p.id AND f.user_id = ?
       WHERE p.id = ?`
    )
    .get(userId, id) as ProductRow | undefined;

  if (!row) {
    res.status(404).json({ error: 'Product not found' });
    return;
  }

  res.json({
    product: {
      id: row.id,
      name: row.name,
      description: row.description,
      price_cents: row.price_cents,
      image_url: row.image_url,
      stock: row.stock,
      category: { id: row.category_id, slug: row.category_slug, name: row.category_name },
      isFavorited: row.is_favorited === 1,
    },
  });
});

export default router;
