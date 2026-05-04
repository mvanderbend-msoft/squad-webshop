import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addFavorite, removeFavorite } from '../api/client';

interface Props {
  productId: number;
  isFavorited: boolean;
  className?: string;
  size?: number;
  onToggled?: (isFavorited: boolean) => void;
}

export function FavoriteButton({ productId, isFavorited, className, size = 22, onToggled }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorited, setFavorited] = useState<boolean>(isFavorited);
  const [pending, setPending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (pending) return;

    const next = !favorited;
    setFavorited(next); // optimistic
    setPending(true);
    setError(null);
    try {
      if (next) {
        await addFavorite(productId);
      } else {
        await removeFavorite(productId);
      }
      onToggled?.(next);
    } catch (err) {
      setFavorited(!next); // rollback
      const msg = err instanceof Error ? err.message : 'Could not update favorite';
      setError(msg);
      window.setTimeout(() => setError(null), 3000);
    } finally {
      setPending(false);
    }
  }

  const label = favorited ? 'Remove from favorites' : 'Add to favorites';

  return (
    <span className={`favorite-btn-wrapper${className ? ' ' + className : ''}`}>
      <button
        type="button"
        className={`favorite-btn${favorited ? ' is-favorited' : ''}`}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        onClick={handleClick}
        data-pending={pending ? 'true' : 'false'}
      >
        <HeartIcon filled={favorited} size={size} />
      </button>
      {error && (
        <span role="alert" className="favorite-btn-toast">
          {error}
        </span>
      )}
    </span>
  );
}

function HeartIcon({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 21s-7.5-4.6-9.6-9.2A5.5 5.5 0 0 1 12 5.6 5.5 5.5 0 0 1 21.6 11.8C19.5 16.4 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
