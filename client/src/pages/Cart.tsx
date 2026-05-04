import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { ErrorBox } from '../components/ErrorBox';
import { useState } from 'react';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

export function Cart() {
  const { cart, loading, updateItem, removeItem } = useCart();
  const navigate = useNavigate();
  const [error, setError] = useState('');

  async function handleQtyChange(itemId: number, qty: number) {
    try {
      await updateItem(itemId, qty);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update');
    }
  }

  async function handleRemove(itemId: number) {
    try {
      await removeItem(itemId);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to remove');
    }
  }

  if (loading) return <div className="container"><p>Loading cart…</p></div>;

  return (
    <div className="container">
      <h1 className="page-title">Your Cart</h1>
      {error && <ErrorBox message={error} />}

      {cart.items.length === 0 ? (
        <div className="empty-state">
          <p>Your cart is empty.</p>
          <Link to="/" className="btn btn-primary">Shop now</Link>
        </div>
      ) : (
        <>
          <div className="cart-list">
            {cart.items.map((item) => (
              <div key={item.id} className="cart-item">
                <img
                  src={item.product.image_url}
                  alt={item.product.name}
                  className="cart-item-img"
                />
                <div className="cart-item-info">
                  <Link to={`/products/${item.product.id}`} className="cart-item-name">
                    {item.product.name}
                  </Link>
                  <p className="cart-item-price">{formatPrice(item.product.price_cents)} each</p>
                </div>
                <div className="cart-item-controls">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      handleQtyChange(item.id, Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="qty-input"
                  />
                  <span className="cart-line-total">{formatPrice(item.line_total_cents)}</span>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleRemove(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <span className="cart-total-label">Total</span>
            <span className="cart-total">{formatPrice(cart.total_cents)}</span>
          </div>

          <div className="cart-actions">
            <Link to="/" className="btn btn-ghost">Continue Shopping</Link>
            <button
              className="btn btn-primary"
              onClick={() => navigate('/checkout')}
            >
              Checkout
            </button>
          </div>
        </>
      )}
    </div>
  );
}
