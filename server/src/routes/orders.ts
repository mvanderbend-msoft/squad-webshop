import { Router } from 'express';
import { db } from '../db/connection.js';
import { authRequired } from '../middleware/auth.js';

const router = Router();
router.use(authRequired);

interface CartItemForOrder {
  id: number;
  product_id: number;
  quantity: number;
  price_cents: number;
}

interface OrderRow {
  id: number;
  user_id: number;
  total_cents: number;
  status: string;
  created_at: string;
}

interface OrderItemRow {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  unit_price_cents: number;
  product_name: string;
  product_image_url: string;
}

// POST /api/orders — checkout from cart
router.post('/', (req, res) => {
  const userId = req.user!.id;

  const cartItems = db
    .prepare(
      `SELECT ci.id, ci.product_id, ci.quantity, p.price_cents
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = ?`
    )
    .all(userId) as CartItemForOrder[];

  if (cartItems.length === 0) {
    res.status(400).json({ error: 'Cart is empty' });
    return;
  }

  const totalCents = cartItems.reduce((sum, i) => sum + i.quantity * i.price_cents, 0);

  const placeOrder = () => {
    db.exec('BEGIN');
    try {
      const orderResult = db
        .prepare('INSERT INTO orders (user_id, total_cents, status) VALUES (?, ?, ?)')
        .run(userId, totalCents, 'paid');
      const orderId = orderResult.lastInsertRowid as number;

      const insertItem = db.prepare(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents) VALUES (?, ?, ?, ?)'
      );
      for (const item of cartItems) {
        insertItem.run(orderId, item.product_id, item.quantity, item.price_cents);
      }

      db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);
      db.exec('COMMIT');
      return db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId) as OrderRow;
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
  };

  const order = placeOrder();
  res.status(201).json({ order });
});

// GET /api/orders — list user's orders
router.get('/', (req, res) => {
  const orders = db
    .prepare(
      `SELECT o.*,
        COUNT(oi.id) AS item_count
       FROM orders o
       LEFT JOIN order_items oi ON oi.order_id = o.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`
    )
    .all(req.user!.id);
  res.json({ orders });
});

// GET /api/orders/:id — order detail
router.get('/:id', (req, res) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    res.status(400).json({ error: 'Invalid order id' });
    return;
  }

  const order = db
    .prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?')
    .get(orderId, req.user!.id) as OrderRow | undefined;

  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const items = db
    .prepare(
      `SELECT oi.*, p.name AS product_name, p.image_url AS product_image_url,
              p.description AS product_description
       FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`
    )
    .all(orderId) as OrderItemRow[];

  res.json({
    order: {
      ...order,
      items: items.map((i) => ({
        id: i.id,
        quantity: i.quantity,
        unit_price_cents: i.unit_price_cents,
        line_total_cents: i.quantity * i.unit_price_cents,
        product: {
          id: i.product_id,
          name: i.product_name,
          image_url: i.product_image_url,
          description: i.product_description,
        },
      })),
    },
  });
});

export default router;
