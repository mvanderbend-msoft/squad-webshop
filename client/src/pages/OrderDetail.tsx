import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getOrder } from '../api/client';
import type { Order } from '../api/client';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

export function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    getOrder(parseInt(id, 10))
      .then(({ order: o }) => setOrder(o))
      .catch((e) => setError(e instanceof Error ? e.message : 'Order not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;
  if (error) return <div className="container"><ErrorBox message={error} /></div>;
  if (!order) return null;

  return (
    <div className="container">
      <h1 className="page-title">Order #{order.id}</h1>
      <div className="order-meta">
        <span className={`order-status status-${order.status}`}>{order.status}</span>
        <span className="order-date">{new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'long' })}</span>
      </div>

      <div className="order-items-list">
        {order.items?.map((item) => (
          <div key={item.id} className="order-item">
            <img
              src={item.product.image_url}
              alt={item.product.name}
              className="order-item-img"
            />
            <div className="order-item-info">
              <p className="order-item-name">{item.product.name}</p>
              <p className="order-item-meta">
                {item.quantity} × {formatPrice(item.unit_price_cents)}
              </p>
            </div>
            <span className="order-item-total">{formatPrice(item.line_total_cents)}</span>
          </div>
        ))}
      </div>

      <div className="order-total-row">
        <strong>Order Total: {formatPrice(order.total_cents)}</strong>
      </div>

      <div className="order-actions">
        <Link to="/account" className="btn btn-ghost">← Back to Orders</Link>
        <Link to="/" className="btn btn-primary">Continue Shopping</Link>
      </div>
    </div>
  );
}
