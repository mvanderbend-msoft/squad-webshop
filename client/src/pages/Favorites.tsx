import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listFavorites } from '../api/client';
import type { FavoriteProduct } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { FavoriteButton } from '../components/FavoriteButton';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

// Note: Removing a favorite via the FavoriteButton on this page leaves the card
// in place but greys out the heart (the button manages its own state). The item
// is removed from the list on next page load / refetch. This avoids reaching
// into FavoriteButton's internals and keeps the UX predictable.
export function Favorites() {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listFavorites()
      .then(({ favorites: f }) => setFavorites(f))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load favorites'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container">
      <h1 className="page-title">Favorites</h1>

      {loading ? (
        <Loading />
      ) : error ? (
        <ErrorBox message={error} />
      ) : favorites.length === 0 ? (
        <div className="empty-state">
          <p>You haven't favorited any products yet.</p>
          <Link to="/" className="btn btn-primary">Browse products</Link>
        </div>
      ) : (
        <div className="product-grid">
          {favorites.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', zIndex: 1 }}>
                <FavoriteButton productId={p.id} isFavorited={true} />
              </div>
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
