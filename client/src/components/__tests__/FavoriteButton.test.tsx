import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FavoriteButton } from '../FavoriteButton';

const navigate = vi.fn();
const mockUseAuth = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../api/client', () => ({
  addFavorite: vi.fn(),
  removeFavorite: vi.fn(),
}));

import { addFavorite, removeFavorite } from '../../api/client';

const addFavoriteMock = addFavorite as unknown as ReturnType<typeof vi.fn>;
const removeFavoriteMock = removeFavorite as unknown as ReturnType<typeof vi.fn>;

function renderButton(props: { productId?: number; isFavorited?: boolean } = {}) {
  return render(
    <MemoryRouter>
      <FavoriteButton productId={props.productId ?? 1} isFavorited={props.isFavorited ?? false} />
    </MemoryRouter>,
  );
}

describe('FavoriteButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.c', name: 'A' } });
    addFavoriteMock.mockResolvedValue(undefined);
    removeFavoriteMock.mockResolvedValue(undefined);
  });

  it('renders unfilled (aria-pressed=false) when isFavorited=false', () => {
    renderButton({ isFavorited: false });
    const btn = screen.getByRole('button', { name: /add to favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).not.toHaveClass('fav-btn--active');
  });

  it('renders filled (aria-pressed=true) when isFavorited=true', () => {
    renderButton({ isFavorited: true });
    const btn = screen.getByRole('button', { name: /remove from favorites/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveClass('fav-btn--active');
  });

  it('optimistically toggles visual state on click', async () => {
    const user = userEvent.setup();
    renderButton({ isFavorited: false });
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(addFavoriteMock).toHaveBeenCalledWith(1);
  });

  it('reverts state and shows toast on API error', async () => {
    addFavoriteMock.mockRejectedValueOnce(new Error('boom'));
    const user = userEvent.setup();
    renderButton({ isFavorited: false });
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(await screen.findByRole('alert')).toHaveTextContent(/boom/i);
  });

  it('redirects unauthenticated user to /login on click', async () => {
    mockUseAuth.mockReturnValue({ user: null });
    const user = userEvent.setup();
    renderButton({ isFavorited: false });
    await user.click(screen.getByRole('button'));
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(addFavoriteMock).not.toHaveBeenCalled();
  });

  it('is activatable via keyboard (Enter)', async () => {
    const user = userEvent.setup();
    renderButton({ isFavorited: false });
    const btn = screen.getByRole('button');
    btn.focus();
    await user.keyboard('{Enter}');
    expect(addFavoriteMock).toHaveBeenCalled();
  });

  it('is activatable via keyboard (Space)', async () => {
    const user = userEvent.setup();
    renderButton({ isFavorited: true });
    const btn = screen.getByRole('button');
    btn.focus();
    await user.keyboard(' ');
    expect(removeFavoriteMock).toHaveBeenCalled();
  });
});
