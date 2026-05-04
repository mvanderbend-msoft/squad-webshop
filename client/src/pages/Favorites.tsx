import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites } from '../api/client';
import type { Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Favorites() {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchFavorites = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { favorites: list } = await getFavorites();
      setFavorites(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load favorites');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  const handleFavoriteChange = useCallback((productId: number, isFavorited: boolean) => {
    if (!isFavorited) {
      // Optimistically remove unfavorited products from this list.
      setFavorites((current) => current.filter((p) => p.id !== productId));
    }
  }, []);

  if (loading) {
    return (
      <div className="container page-favorites">
        <h1 className="page-title">My Favorites</h1>
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page-favorites">
        <h1 className="page-title">My Favorites</h1>
        <ErrorBox message={error} />
        <button className="btn btn-primary" onClick={() => void fetchFavorites()}>
          Try again
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container page-favorites">
        <h1 className="page-title">My Favorites</h1>
        <div className="empty-state">
          <p>No favorites yet — start browsing!</p>
          <Link to="/" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-favorites">
      <h1 className="page-title">My Favorites</h1>
      <div className="product-grid">
        {favorites.map((p) => (
          <ProductCard
            key={p.id}
            product={{ ...p, isFavorited: true }}
            onFavoriteChange={handleFavoriteChange}
          />
        ))}
      </div>
    </div>
  );
}
