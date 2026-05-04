import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../api/client';
import type { Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Favorites() {
  const [favorites, setFavorites] = useState<Product[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { favorites: f } = await getFavorites();
      // Server returns isFavorited via product responses elsewhere; on this
      // page every entry is by definition favorited.
      setFavorites(f.map((p) => ({ ...p, isFavorited: true })));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="container page-favorites">
      <header className="page-header">
        <h1>Your favorites</h1>
      </header>

      {loading ? (
        <Loading />
      ) : error ? (
        <div>
          <ErrorBox message={error} />
          <button className="btn btn-primary" onClick={() => void load()}>
            Retry
          </button>
        </div>
      ) : favorites && favorites.length === 0 ? (
        <div className="empty-state">
          <p>No favorites yet — start browsing!</p>
          <Link to="/" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {favorites?.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
