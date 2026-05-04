import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { FavoriteButton } from '../FavoriteButton';

// --- Mocks ----------------------------------------------------------------

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return {
    ...actual,
    useNavigate: () => navigateSpy,
  };
});

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const addFavoriteMock = vi.fn();
const removeFavoriteMock = vi.fn();
vi.mock('../../api/client', () => ({
  addFavorite: (...args: unknown[]) => addFavoriteMock(...args),
  removeFavorite: (...args: unknown[]) => removeFavoriteMock(...args),
}));

// --- Helpers --------------------------------------------------------------

const FAKE_USER = { id: 1, email: 'u@example.com', name: 'U' };

function renderButton(props: { productId?: number; isFavorited?: boolean } = {}) {
  const { productId = 42, isFavorited = false } = props;
  return render(
    <MemoryRouter>
      <FavoriteButton productId={productId} isFavorited={isFavorited} />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: FAKE_USER, token: 't', loading: false });
});

// --- Tests ----------------------------------------------------------------

describe('<FavoriteButton />', () => {
  describe('rendering', () => {
    it('renders an unfilled heart when isFavorited=false', () => {
      renderButton({ isFavorited: false });
      const btn = screen.getByRole('button', { name: /add to favorites/i });
      expect(btn).toBeInTheDocument();
      expect(btn).not.toHaveClass('is-favorited');
      const path = btn.querySelector('svg path');
      expect(path).toHaveAttribute('fill', 'none');
    });

    it('renders a filled heart when isFavorited=true', () => {
      renderButton({ isFavorited: true });
      const btn = screen.getByRole('button', { name: /remove from favorites/i });
      expect(btn).toBeInTheDocument();
      expect(btn).toHaveClass('is-favorited');
      const path = btn.querySelector('svg path');
      expect(path).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('toggle behaviour', () => {
    it('optimistically toggles visual state on click (false → true)', async () => {
      addFavoriteMock.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ isFavorited: true }), 50)),
      );
      const user = userEvent.setup();
      renderButton({ isFavorited: false });

      const btn = screen.getByRole('button', { name: /add to favorites/i });
      expect(btn).toHaveAttribute('aria-pressed', 'false');

      await user.click(btn);

      // Optimistic: aria-pressed flips immediately, before the API resolves.
      const flipped = screen.getByRole('button', { name: /remove from favorites/i });
      expect(flipped).toHaveAttribute('aria-pressed', 'true');
      expect(flipped).toHaveClass('is-favorited');
      expect(addFavoriteMock).toHaveBeenCalledWith(42);

      await waitFor(() => {
        expect(flipped).toHaveAttribute('data-pending', 'false');
      });
    });

    it('optimistically toggles visual state on click (true → false)', async () => {
      removeFavoriteMock.mockResolvedValue({ isFavorited: false });
      const user = userEvent.setup();
      renderButton({ isFavorited: true });

      await user.click(screen.getByRole('button', { name: /remove from favorites/i }));

      expect(
        screen.getByRole('button', { name: /add to favorites/i }),
      ).toHaveAttribute('aria-pressed', 'false');
      expect(removeFavoriteMock).toHaveBeenCalledWith(42);
    });

    it('reverts to previous state when the API errors', async () => {
      addFavoriteMock.mockRejectedValue(new Error('Server exploded'));
      const user = userEvent.setup();
      renderButton({ isFavorited: false });

      await user.click(screen.getByRole('button', { name: /add to favorites/i }));

      // After the rejected promise settles, the button should rollback.
      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /add to favorites/i }),
        ).toHaveAttribute('aria-pressed', 'false');
      });
      expect(await screen.findByRole('alert')).toHaveTextContent(/server exploded/i);
    });

    it('redirects to /login when an unauthenticated user clicks', async () => {
      useAuthMock.mockReturnValue({ user: null, token: null, loading: false });
      const user = userEvent.setup();
      renderButton({ isFavorited: false });

      await user.click(screen.getByRole('button', { name: /add to favorites/i }));

      expect(navigateSpy).toHaveBeenCalledWith('/login');
      expect(addFavoriteMock).not.toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('exposes aria-pressed reflecting the current favorite state', async () => {
      addFavoriteMock.mockResolvedValue({ isFavorited: true });
      const user = userEvent.setup();

      // Initial state false → aria-pressed=false.
      const { unmount } = renderButton({ isFavorited: false });
      const btn = screen.getByRole('button');
      expect(btn).toHaveAttribute('aria-pressed', 'false');

      // After toggling on, aria-pressed flips to true.
      await user.click(btn);
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
      unmount();

      // A freshly-mounted button seeded with isFavorited=true reports true.
      renderButton({ isFavorited: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('is activatable via keyboard (Enter)', async () => {
      addFavoriteMock.mockResolvedValue({ isFavorited: true });
      const user = userEvent.setup();
      renderButton({ isFavorited: false });

      const btn = screen.getByRole('button', { name: /add to favorites/i });
      btn.focus();
      expect(btn).toHaveFocus();

      await user.keyboard('{Enter}');

      await waitFor(() => expect(addFavoriteMock).toHaveBeenCalledWith(42));
      expect(
        screen.getByRole('button', { name: /remove from favorites/i }),
      ).toHaveAttribute('aria-pressed', 'true');
    });

    it('is activatable via keyboard (Space)', async () => {
      addFavoriteMock.mockResolvedValue({ isFavorited: true });
      const user = userEvent.setup();
      renderButton({ isFavorited: false });

      const btn = screen.getByRole('button', { name: /add to favorites/i });
      btn.focus();

      await user.keyboard(' ');

      await waitFor(() => expect(addFavoriteMock).toHaveBeenCalledWith(42));
      expect(
        screen.getByRole('button', { name: /remove from favorites/i }),
      ).toHaveAttribute('aria-pressed', 'true');
    });
  });
});
