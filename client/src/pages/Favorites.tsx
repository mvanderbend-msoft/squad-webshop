import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../api/client';
import type { Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

type Status = 'loading' | 'ready' | 'error';

export function Favorites() {
  const [products, setProducts] = useState<Product[]>([]);
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setStatus('loading');
    setError('');
    try {
      const { products: list } = await getFavorites();
      // Server returns full product objects; mark them all as favorited so the
      // heart icon renders correctly even if the API response omits the field.
      setProducts(list.map((p) => ({ ...p, isFavorited: true })));
      setStatus('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleFavoriteToggled(productId: number, nextIsFavorited: boolean) {
    if (!nextIsFavorited) {
      // User unfavorited — drop the card from the list.
      setProducts((prev) => prev.filter((p) => p.id !== productId));
    }
  }

  return (
    <div className="container page-favorites">
      <h1 className="page-title">Your Favorites</h1>

      {status === 'loading' && <Loading />}

      {status === 'error' && (
        <div>
          <ErrorBox message={error} />
          <button className="btn btn-ghost mt" onClick={() => void load()}>
            Try again
          </button>
        </div>
      )}

      {status === 'ready' && products.length === 0 && (
        <div className="empty-state">
          <p>No favorites yet — start browsing!</p>
          <Link to="/" className="btn btn-primary mt">
            Browse products
          </Link>
        </div>
      )}

      {status === 'ready' && products.length > 0 && (
        <div className="product-grid">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              onFavoriteToggled={handleFavoriteToggled}
            />
          ))}
        </div>
      )}
    </div>
  );
}
