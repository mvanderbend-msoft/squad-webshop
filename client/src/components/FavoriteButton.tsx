import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { addFavorite, removeFavorite, UnauthorizedError } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  productId: number;
  productName: string;
  initialFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onChange?: (next: boolean) => void;
}

export function FavoriteButton({
  productId,
  productName,
  initialFavorited = false,
  size = 'md',
  onChange,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [favorited, setFavorited] = useState<boolean>(initialFavorited);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>('');

  async function handleClick() {
    if (pending) return;

    if (!user) {
      navigate('/login', { state: { from: location.pathname } });
      return;
    }

    const previous = favorited;
    const next = !previous;

    setFavorited(next);
    setError('');
    setPending(true);
    onChange?.(next);

    try {
      const res = next
        ? await addFavorite(productId)
        : await removeFavorite(productId);
      if (typeof res.isFavorited === 'boolean' && res.isFavorited !== next) {
        setFavorited(res.isFavorited);
        onChange?.(res.isFavorited);
      }
    } catch (e) {
      setFavorited(previous);
      onChange?.(previous);
      if (e instanceof UnauthorizedError) {
        navigate('/login', { state: { from: location.pathname } });
        return;
      }
      setError(e instanceof Error ? e.message : 'Could not update favorite');
    } finally {
      setPending(false);
    }
  }

  const label = favorited
    ? `Remove ${productName} from favorites`
    : `Add ${productName} to favorites`;

  return (
    <button
      type="button"
      className={`favorite-btn favorite-btn-${size}${favorited ? ' is-favorited' : ''}${pending ? ' is-pending' : ''}`}
      aria-pressed={favorited}
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void handleClick();
      }}
      disabled={pending}
    >
      <span className="favorite-btn-icon" aria-hidden="true">
        {favorited ? '♥' : '♡'}
      </span>
      {error && (
        <span role="alert" className="favorite-btn-error">
          {error}
        </span>
      )}
    </button>
  );
}
