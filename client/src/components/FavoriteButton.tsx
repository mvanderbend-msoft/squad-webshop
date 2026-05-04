import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addFavorite, removeFavorite } from '../api/client';

interface Props {
  productId: number;
  isFavorited: boolean;
}

export function FavoriteButton({ productId, isFavorited: initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const { user } = useAuth();
  const navigate = useNavigate();

  // Keep in sync if parent re-renders with a new value (e.g. after API integration)
  useEffect(() => {
    setFavorited(initialFavorited);
  }, [initialFavorited]);

  // Auto-dismiss toast after 3 seconds
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  async function handleClick() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (pending) return;

    const next = !favorited;
    setFavorited(next); // optimistic update
    setPending(true);
    try {
      if (next) {
        await addFavorite(productId);
      } else {
        await removeFavorite(productId);
      }
    } catch (e) {
      setFavorited(!next); // revert on failure
      setToast(e instanceof Error ? e.message : 'Could not update favorites');
    } finally {
      setPending(false);
    }
  }

  const label = favorited ? 'Remove from favorites' : 'Add to favorites';

  return (
    <>
      <button
        type="button"
        className={`fav-btn${favorited ? ' fav-btn--active' : ''}`}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        onClick={handleClick}
      >
        {favorited ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            width="20"
            height="20"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            width="20"
            height="20"
          >
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        )}
      </button>
      {toast && (
        <div className="fav-toast" role="alert" aria-live="assertive">
          {toast}
        </div>
      )}
    </>
  );
}
