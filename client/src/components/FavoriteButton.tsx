import { useEffect, useState, useCallback, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { addFavorite, removeFavorite } from '../api/client';

interface Props {
  productId: number;
  isFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onChange?: (isFavorited: boolean) => void;
}

export function FavoriteButton({
  productId,
  isFavorited: initialIsFavorited = false,
  size = 'md',
  className,
  onChange,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorited, setFavorited] = useState<boolean>(initialIsFavorited);
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Keep local state in sync if the parent prop changes (e.g., after auth load).
  useEffect(() => {
    setFavorited(initialIsFavorited);
  }, [initialIsFavorited]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggle = useCallback(async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (pending) return;

    const next = !favorited;
    setFavorited(next); // optimistic
    setPending(true);
    try {
      if (next) {
        await addFavorite(productId);
      } else {
        await removeFavorite(productId);
      }
      onChange?.(next);
    } catch (err) {
      // Roll back
      setFavorited(!next);
      const msg = err instanceof Error ? err.message : 'Could not update favorite';
      setToast(msg);
    } finally {
      setPending(false);
    }
  }, [favorited, navigate, onChange, pending, productId, user]);

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    // Buttons handle Enter/Space natively, but include for safety in case
    // the element is later restyled with role overrides.
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      void toggle();
    }
  };

  const label = favorited ? 'Remove from favorites' : 'Add to favorites';

  return (
    <>
      <button
        type="button"
        className={`favorite-btn favorite-btn-${size}${favorited ? ' is-favorited' : ''}${className ? ' ' + className : ''}`}
        aria-pressed={favorited}
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void toggle();
        }}
        onKeyDown={handleKeyDown}
        data-pending={pending ? 'true' : undefined}
      >
        <HeartIcon filled={favorited} />
      </button>
      {toast && (
        <div className="favorite-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}
    </>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className="favorite-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M12 21s-7.5-4.5-9.5-9.5C1.2 8.2 3.5 5 6.7 5c1.9 0 3.4 1 4.3 2.3h2C14 6 15.5 5 17.4 5c3.2 0 5.5 3.2 4.2 6.5C19.6 16.5 12 21 12 21z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
