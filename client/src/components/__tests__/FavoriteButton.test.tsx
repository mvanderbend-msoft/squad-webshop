import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { FavoriteButton } from '../FavoriteButton';
import { AuthProvider } from '../../context/AuthContext';
import * as api from '../../api/client';

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>(
    '../../api/client'
  );
  return {
    ...actual,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    me: vi.fn(),
  };
});

const mocked = api as unknown as {
  addFavorite: ReturnType<typeof vi.fn>;
  removeFavorite: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
};

function renderWithAuth(
  ui: React.ReactElement,
  { authed = true, initialPath = '/' }: { authed?: boolean; initialPath?: string } = {}
) {
  if (authed) {
    localStorage.setItem('squad_token', 'fake-token');
    mocked.me.mockResolvedValue({
      user: { id: 1, email: 'u@example.com', name: 'U' },
    });
  } else {
    localStorage.removeItem('squad_token');
  }
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={ui} />
          <Route path="/login" element={<div data-testid="login-page">login</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

describe('FavoriteButton', () => {
  it('renders unfilled heart by default with aria-pressed=false', async () => {
    renderWithAuth(<FavoriteButton productId={1} />);
    const btn = await screen.findByRole('button', { name: /add to favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).not.toHaveClass('is-favorited');
  });

  it('renders filled heart with aria-pressed=true when isFavorited prop is true', async () => {
    renderWithAuth(<FavoriteButton productId={1} isFavorited />);
    const btn = await screen.findByRole('button', { name: /remove from favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveClass('is-favorited');
  });

  it('optimistically toggles to favorited and calls addFavorite', async () => {
    mocked.addFavorite.mockResolvedValue({ isFavorited: true });
    const onChange = vi.fn();
    renderWithAuth(<FavoriteButton productId={42} onChange={onChange} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /add to favorites/i });

    await user.click(btn);

    // Optimistic flip happens before the await resolves; assert post-resolve.
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));
    expect(mocked.addFavorite).toHaveBeenCalledWith(42);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('optimistically toggles to unfavorited and calls removeFavorite', async () => {
    mocked.removeFavorite.mockResolvedValue({ isFavorited: false });
    const onChange = vi.fn();
    renderWithAuth(<FavoriteButton productId={7} isFavorited onChange={onChange} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /remove from favorites/i });

    await user.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
    expect(mocked.removeFavorite).toHaveBeenCalledWith(7);
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('rolls back state and shows toast on add failure', async () => {
    mocked.addFavorite.mockRejectedValue(new Error('Network down'));
    renderWithAuth(<FavoriteButton productId={1} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /add to favorites/i });

    await user.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
    expect(await screen.findByRole('status')).toHaveTextContent('Network down');
  });

  it('rolls back state and shows toast on remove failure', async () => {
    mocked.removeFavorite.mockRejectedValue(new Error('Server error'));
    renderWithAuth(<FavoriteButton productId={1} isFavorited />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /remove from favorites/i });

    await user.click(btn);

    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'true'));
    expect(await screen.findByRole('status')).toHaveTextContent('Server error');
  });

  it('redirects unauthenticated users to /login when clicked', async () => {
    renderWithAuth(<FavoriteButton productId={1} />, { authed: false });
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /add to favorites/i });

    await user.click(btn);

    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(mocked.addFavorite).not.toHaveBeenCalled();
  });

  it('responds to keyboard activation (Enter)', async () => {
    mocked.addFavorite.mockResolvedValue({ isFavorited: true });
    renderWithAuth(<FavoriteButton productId={1} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /add to favorites/i });
    btn.focus();

    await user.keyboard('{Enter}');

    await waitFor(() => expect(mocked.addFavorite).toHaveBeenCalledWith(1));
  });

  it('responds to keyboard activation (Space)', async () => {
    mocked.addFavorite.mockResolvedValue({ isFavorited: true });
    renderWithAuth(<FavoriteButton productId={1} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /add to favorites/i });
    btn.focus();

    await user.keyboard(' ');

    await waitFor(() => expect(mocked.addFavorite).toHaveBeenCalledWith(1));
  });

  it('ignores rapid double-clicks while a request is pending', async () => {
    let resolveAdd: (v: unknown) => void = () => {};
    mocked.addFavorite.mockImplementation(
      () => new Promise((resolve) => (resolveAdd = resolve))
    );
    renderWithAuth(<FavoriteButton productId={1} />);
    const user = userEvent.setup();
    const btn = await screen.findByRole('button', { name: /add to favorites/i });

    await user.click(btn);
    await user.click(btn);
    await user.click(btn);

    expect(mocked.addFavorite).toHaveBeenCalledTimes(1);
    await act(async () => {
      resolveAdd({ isFavorited: true });
    });
  });
});
