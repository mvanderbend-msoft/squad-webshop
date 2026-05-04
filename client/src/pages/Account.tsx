import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getOrders } from '../api/client';
import type { Order } from '../api/client';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

export function Account() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    getOrders()
      .then(({ orders: o }) => setOrders(o))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load orders'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Account</h1>
      {user && (
        <div className="account-info">
          <p><strong>{user.name}</strong></p>
          <p className="text-muted">{user.email}</p>
        </div>
      )}

      <h2 className="section-title">Order History</h2>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : orders.length === 0 ? (
        <div className="empty-state">
          <p>No orders yet.</p>
          <Link to="/" className="btn btn-primary">Start shopping</Link>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <Link key={order.id} to={`/orders/${order.id}`} className="order-card">
              <div className="order-card-left">
                <span className="order-card-id">Order #{order.id}</span>
                <span className="order-card-date">
                  {new Date(order.created_at).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                </span>
              </div>
              <div className="order-card-right">
                <span className={`order-status status-${order.status}`}>{order.status}</span>
                <span className="order-card-total">{formatPrice(order.total_cents)}</span>
                <span className="order-card-items">{order.item_count} item{order.item_count !== 1 ? 's' : ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
