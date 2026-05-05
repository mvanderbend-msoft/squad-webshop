import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../api/client';
import type { Product } from '../api/client';
import { ProductCard } from '../components/ProductCard';
import { Loading } from '../components/Loading';
import { ErrorBox } from '../components/ErrorBox';

export function Favorites() {
  const [stuffYouLiked, setStuffYouLiked] = useState<Product[]>([]);
  const [mehLoading, setMehLoading] = useState(true);
  const [whoopsie, setWhoopsie] = useState('');
  const [kissOffPending, setKissOffPending] = useState<number | null>(null);

  const fetchTheGoods = useCallback(async () => {
    setMehLoading(true);
    setWhoopsie('');
    try {
      const { products } = await getFavorites();
      setStuffYouLiked(products);
    } catch (e) {
      setWhoopsie(e instanceof Error ? e.message : 'Failed to load favorites');
    } finally {
      setMehLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTheGoods();
  }, [fetchTheGoods]);

  async function kissOffProduct(productId: number) {
    setKissOffPending(productId);
    const previous = stuffYouLiked;
    setStuffYouLiked((current) => current.filter((p) => p.id !== productId));
    try {
      await removeFavorite(productId);
    } catch (e) {
      // rollback on failure
      setStuffYouLiked(previous);
      setWhoopsie(e instanceof Error ? e.message : 'Failed to remove favorite');
    } finally {
      setKissOffPending(null);
    }
  }

  return (
    <div className="container page-favorites">
      <h1 className="page-title">Your Favorites</h1>

      {mehLoading ? (
        <Loading />
      ) : whoopsie ? (
        <>
          <ErrorBox message={whoopsie} />
          <button className="btn btn-primary" onClick={() => void fetchTheGoods()}>
            Try again
          </button>
        </>
      ) : stuffYouLiked.length === 0 ? (
        <div className="empty-state">
          <p>No favorites yet — start browsing!</p>
          <Link to="/" className="btn btn-primary">
            Browse products
          </Link>
        </div>
      ) : (
        <div className="product-grid">
          {stuffYouLiked.map((p) => (
            <div key={p.id} className="favorite-tile">
              <ProductCard product={p} />
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => void kissOffProduct(p.id)}
                disabled={kissOffPending === p.id}
                aria-label={`Remove ${p.name} from favorites`}
              >
                {kissOffPending === p.id ? 'Removing…' : 'Remove from favorites'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
