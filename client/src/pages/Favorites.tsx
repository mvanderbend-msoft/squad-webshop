import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, UnauthorizedError } from '../api/client';
import type { Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Favorites() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const items = await getFavorites();
      setProducts(items.map((p) => ({ ...p, isFavorited: true })));
    } catch (e) {
      if (e instanceof UnauthorizedError) {
        setError('Please log in to view your favorites.');
      } else {
        setError(e instanceof Error ? e.message : 'Failed to load favorites');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  function handleFavoriteChange(productId: number, isFavorited: boolean) {
    if (!isFavorited) {
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  }

  return (
    <div className="container page-favorites">
      <header className="page-header">
        <h1 className="page-title">Your Favorites</h1>
        <p className="page-subtitle">Products you've saved for later.</p>
      </header>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : products.length === 0 ? (
        <div className="empty-state empty-state-card">
          <p className="empty-state-title">No favorites yet</p>
          <p className="empty-state-text">
            Tap the heart on any product to save it here.
          </p>
          <Link to="/" className="btn btn-primary mt">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onFavoriteChange={(next) => handleFavoriteChange(p.id, next)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
