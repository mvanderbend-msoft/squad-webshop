import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getProduct } from '../api/client';
import type { Product } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';
import { FavoriteButton } from '../components/FavoriteButton';

function formatPrice(cents: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(cents / 100);
}

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qty, setQty] = useState(1);
  const [adding, setAdding] = useState(false);
  const [addedMsg, setAddedMsg] = useState('');

  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    getProduct(parseInt(id, 10))
      .then(({ product: p }) => setProduct(p))
      .catch((e) => setError(e instanceof Error ? e.message : 'Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddToCart() {
    if (!product) return;
    setAdding(true);
    try {
      await addItem(product.id, qty);
      setAddedMsg('Added to cart!');
      setTimeout(() => setAddedMsg(''), 2500);
    } catch (e) {
      setAddedMsg(e instanceof Error ? e.message : 'Failed to add');
    } finally {
      setAdding(false);
    }
  }

  if (loading) return <Loading />;
  if (error) return <div className="container"><ErrorBox message={error} /></div>;
  if (!product) return null;

  return (
    <div className="container product-detail">
      <Link to="/" className="back-link">← Back to products</Link>
      <div className="product-detail-grid">
        <img src={product.image_url} alt={product.name} className="product-detail-img" />
        <div className="product-detail-info">
          <span className="card-category">{product.category.name}</span>
          <div className="product-detail-title-row">
            <h1 className="product-detail-title">{product.name}</h1>
            <FavoriteButton
              productId={product.id}
              isFavorited={product.isFavorited ?? false}
            />
          </div>
          <p className="product-detail-price">{formatPrice(product.price_cents)}</p>
          <p className="product-detail-description">{product.description}</p>
          <p className={`product-stock${product.stock < 10 ? ' low' : ''}`}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </p>

          {user ? (
            <div className="add-to-cart-row">
              <input
                type="number"
                min={1}
                max={product.stock}
                value={qty}
                onChange={(e) => setQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                className="qty-input"
              />
              <button
                className="btn btn-primary"
                onClick={handleAddToCart}
                disabled={adding || product.stock === 0}
              >
                {adding ? 'Adding…' : 'Add to Cart'}
              </button>
            </div>
          ) : (
            <p className="login-prompt">
              <Link to="/login" state={{ from: `/products/${product.id}` }}>Log in</Link>{' '}
              to add to cart.
            </p>
          )}
          {addedMsg && <p className="success-msg">{addedMsg}</p>}

          <button className="btn btn-ghost mt" onClick={() => navigate('/')}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );
}
