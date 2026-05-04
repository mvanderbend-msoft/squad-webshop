import { Router } from 'express';
import { db } from '../db/connection.js';

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
}

// GET /api/categories
router.get('/categories', (_req, res) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json({ categories });
});

// GET /api/products?category=<slug>&q=<search>
router.get('/', (req, res) => {
  const { category, q } = req.query;
  let sql = `
    SELECT p.*, c.slug AS category_slug, c.name AS category_name
    FROM products p
    JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: unknown[] = [];

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

  const row = db
    .prepare(
      `SELECT p.*, c.slug AS category_slug, c.name AS category_name
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`
    )
    .get(id) as ProductRow | undefined;

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
    },
  });
});

export default router;
