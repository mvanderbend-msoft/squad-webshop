import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { placeOrder } from '../api/client';
import { ErrorBox } from '../components/ErrorBox';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

export function Checkout() {
  const { cart, refresh } = useCart();
  const navigate = useNavigate();
  const [nameOnCard, setNameOnCard] = useState('');
  const [last4, setLast4] = useState('');
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState('');

  async function handlePlaceOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!nameOnCard.trim() || !last4.trim()) {
      setError('Please fill in all card fields.');
      return;
    }
    setPlacing(true);
    setError('');
    try {
      const { order } = await placeOrder();
      await refresh();
      navigate(`/orders/${order.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order');
      setPlacing(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <div className="container">
        <h1 className="page-title">Checkout</h1>
        <p>Your cart is empty. <a href="/">Go shopping!</a></p>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <h1 className="page-title">Checkout</h1>

      <div className="checkout-grid">
        <section className="order-summary">
          <h2>Order Summary</h2>
          <ul className="summary-list">
            {cart.items.map((item) => (
              <li key={item.id} className="summary-item">
                <span className="summary-name">{item.product.name} × {item.quantity}</span>
                <span className="summary-price">{formatPrice(item.line_total_cents)}</span>
              </li>
            ))}
          </ul>
          <div className="summary-total">
            <strong>Total: {formatPrice(cart.total_cents)}</strong>
          </div>
        </section>

        <section className="payment-section">
          <h2>Payment Details</h2>
          <p className="payment-note">Demo only — no real payment processed.</p>
          {error && <ErrorBox message={error} />}
          <form className="form" onSubmit={handlePlaceOrder}>
            <label className="form-label">
              Name on card
              <input
                className="form-input"
                type="text"
                required
                placeholder="Jane Smith"
                value={nameOnCard}
                onChange={(e) => setNameOnCard(e.target.value)}
              />
            </label>
            <label className="form-label">
              Last 4 digits
              <input
                className="form-input"
                type="text"
                required
                placeholder="1234"
                maxLength={4}
                pattern="\d{4}"
                value={last4}
                onChange={(e) => setLast4(e.target.value)}
              />
            </label>
            <button className="btn btn-primary btn-full" type="submit" disabled={placing}>
              {placing ? 'Placing order…' : `Place Order — ${formatPrice(cart.total_cents)}`}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
