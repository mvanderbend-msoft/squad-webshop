import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';

// Mock the API client BEFORE importing the component under test
vi.mock('../../api/client', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

// Mock the auth context. We expose a settable user so individual tests can
// flip between authed and unauthed without re-mocking the module.
let currentUser: { id: number; email: string; name: string } | null = null;
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ user: currentUser }),
}));

// Spy on react-router's useNavigate so we can assert redirect behaviour.
const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => navigateSpy };
});

import { FavoriteButton } from '../FavoriteButton';
import { addFavorite, removeFavorite } from '../../api/client';

const addFavMock = vi.mocked(addFavorite);
const removeFavMock = vi.mocked(removeFavorite);

function wrap(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

beforeEach(() => {
  currentUser = { id: 1, email: 'a@b.c', name: 'Tester' };
  addFavMock.mockReset();
  removeFavMock.mockReset();
  navigateSpy.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FavoriteButton', () => {
  it('renders an unfilled heart when isFavorited is false', () => {
    wrap(<FavoriteButton productId={1} isFavorited={false} />);
    const btn = screen.getByRole('button', { name: /add to favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    const svg = btn.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('none');
  });

  it('renders a filled heart when isFavorited is true', () => {
    wrap(<FavoriteButton productId={1} isFavorited={true} />);
    const btn = screen.getByRole('button', { name: /remove from favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    const svg = btn.querySelector('svg')!;
    expect(svg.getAttribute('fill')).toBe('currentColor');
  });

  it('optimistically toggles visual state on click before API resolves', async () => {
    let resolveAdd: (v: { ok: true }) => void = () => {};
    addFavMock.mockImplementation(
      () => new Promise((resolve) => { resolveAdd = resolve; }),
    );

    const user = userEvent.setup();
    wrap(<FavoriteButton productId={42} isFavorited={false} />);

    const btn = screen.getByRole('button', { name: /add to favorites/i });
    await user.click(btn);

    // Optimistic flip: aria-pressed flips before API resolves
    const flipped = screen.getByRole('button', { name: /remove from favorites/i });
    expect(flipped).toHaveAttribute('aria-pressed', 'true');
    expect(flipped).toHaveAttribute('data-pending', 'true');
    expect(addFavMock).toHaveBeenCalledWith(42);

    await act(async () => {
      resolveAdd({ ok: true });
    });

    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute('data-pending', 'false'),
    );
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('rolls back to previous state when the add API call fails', async () => {
    addFavMock.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={5} isFavorited={false} />);

    const btn = screen.getByRole('button', { name: /add to favorites/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    });
    expect(
      screen.getByRole('button', { name: /add to favorites/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/could not save favorite.*boom/i);
  });

  it('rolls back to previous state when the remove API call fails', async () => {
    removeFavMock.mockRejectedValueOnce(new Error('nope'));
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={5} isFavorited={true} />);

    const btn = screen.getByRole('button', { name: /remove from favorites/i });
    await user.click(btn);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });
    expect(screen.getByRole('status')).toHaveTextContent(/could not remove favorite.*nope/i);
  });

  it('exposes aria-pressed reflecting current favorite state', async () => {
    addFavMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={7} isFavorited={false} />);

    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    await user.click(screen.getByRole('button'));
    await waitFor(() =>
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true'),
    );
  });

  it('activates via Enter key', async () => {
    addFavMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={9} isFavorited={false} />);

    const btn = screen.getByRole('button');
    btn.focus();
    expect(btn).toHaveFocus();
    await user.keyboard('{Enter}');

    await waitFor(() => expect(addFavMock).toHaveBeenCalledWith(9));
  });

  it('activates via Space key', async () => {
    addFavMock.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={11} isFavorited={false} />);

    const btn = screen.getByRole('button');
    btn.focus();
    await user.keyboard(' ');

    await waitFor(() => expect(addFavMock).toHaveBeenCalledWith(11));
  });

  it('redirects unauthenticated users to /login instead of calling the API', async () => {
    currentUser = null;
    const user = userEvent.setup();
    wrap(<FavoriteButton productId={3} isFavorited={false} />);

    await user.click(screen.getByRole('button'));

    expect(addFavMock).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(/please log in/i);

    await waitFor(
      () => expect(navigateSpy).toHaveBeenCalledWith('/login'),
      { timeout: 2000 },
    );
  });

  it('ignores rapid double-clicks while a request is in flight', async () => {
    let resolveAdd: (v: { ok: true }) => void = () => {};
    addFavMock.mockImplementation(
      () => new Promise((resolve) => { resolveAdd = resolve; }),
    );

    const user = userEvent.setup();
    wrap(<FavoriteButton productId={1} isFavorited={false} />);

    const btn = screen.getByRole('button');
    await user.click(btn);
    await user.click(btn);
    await user.click(btn);

    expect(addFavMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveAdd({ ok: true });
    });
  });
});
