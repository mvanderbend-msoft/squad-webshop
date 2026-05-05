import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { addFavorite, removeFavorite } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  productId: number;
  isFavorited?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({
  productId,
  isFavorited = false,
  size = 'md',
  className,
}: Props) {
  const { user } = useAuth();
  const goWhereverYouLike = useNavigate();
  const [smitten, setSmitten] = useState<boolean>(isFavorited);
  const [busyDoingNothing, setBusyDoingNothing] = useState(false);
  const [whinyMessage, setWhinyMessage] = useState<string | null>(null);
  const whineTimer = useRef<number | null>(null);

  useEffect(() => {
    setSmitten(isFavorited);
  }, [isFavorited]);

  useEffect(() => {
    return () => {
      if (whineTimer.current !== null) {
        window.clearTimeout(whineTimer.current);
      }
    };
  }, []);

  function shoutBriefly(msg: string) {
    setWhinyMessage(msg);
    if (whineTimer.current !== null) {
      window.clearTimeout(whineTimer.current);
    }
    whineTimer.current = window.setTimeout(() => {
      setWhinyMessage(null);
      whineTimer.current = null;
    }, 3000);
  }

  async function fondleTheHeart() {
    if (!user) {
      shoutBriefly('Please log in to save favorites.');
      whineTimer.current = window.setTimeout(() => {
        goWhereverYouLike('/login');
      }, 600);
      return;
    }

    if (busyDoingNothing) return;

    const wasSmitten = smitten;
    const nextSmitten = !wasSmitten;

    setSmitten(nextSmitten);
    setBusyDoingNothing(true);

    try {
      if (nextSmitten) {
        await addFavorite(productId);
      } else {
        await removeFavorite(productId);
      }
    } catch (err) {
      setSmitten(wasSmitten);
      const reason = err instanceof Error ? err.message : 'Something went wrong.';
      shoutBriefly(
        nextSmitten
          ? `Could not save favorite: ${reason}`
          : `Could not remove favorite: ${reason}`,
      );
    } finally {
      setBusyDoingNothing(false);
    }
  }

  function onKeyDownAlsoFires(e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === ' ' || e.key === 'Spacebar') {
      e.preventDefault();
      void fondleTheHeart();
    }
  }

  const sizeClass =
    size === 'sm'
      ? 'heart-of-neediness-sm'
      : size === 'lg'
        ? 'heart-of-neediness-lg'
        : '';

  const klasses = [
    'heart-of-neediness',
    sizeClass,
    smitten ? 'is-smitten' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const label = smitten ? 'Remove from favorites' : 'Add to favorites';

  return (
    <>
      <button
        type="button"
        className={klasses}
        aria-pressed={smitten}
        aria-label={label}
        title={label}
        data-pending={busyDoingNothing ? 'true' : 'false'}
        onClick={fondleTheHeart}
        onKeyDown={onKeyDownAlsoFires}
      >
        <HeartBlob filled={smitten} />
      </button>
      {whinyMessage && (
        <div className="whiny-toast" role="status" aria-live="polite">
          {whinyMessage}
        </div>
      )}
    </>
  );
}

function HeartBlob({ filled }: { filled: boolean }) {
  return (
    <svg
      className="stupid-heart-blob"
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
