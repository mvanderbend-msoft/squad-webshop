import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Favorites } from '../Favorites';

const mockUseAuth = vi.fn();

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../../api/client', () => ({
  getFavorites: vi.fn(),
  addFavorite: vi.fn().mockResolvedValue(undefined),
  removeFavorite: vi.fn().mockResolvedValue(undefined),
}));

import { getFavorites } from '../../api/client';
const getFavoritesMock = getFavorites as unknown as ReturnType<typeof vi.fn>;

// Lightweight ProtectedRoute reproduction to test redirect.
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = mockUseAuth();
  if (loading) return <div>Loading…</div>;
  if (!user) return <div data-testid="login-page">login</div>;
  return <>{children}</>;
}

function renderFavorites() {
  return render(
    <MemoryRouter initialEntries={['/favorites']}>
      <Routes>
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div data-testid="login-page">login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

const mockProduct = {
  id: 1,
  name: 'Test Product',
  description: 'Desc',
  price_cents: 1000,
  image_url: 'http://example.com/p.png',
  stock: 10,
  category: { id: 1, slug: 'cat', name: 'Cat' },
  isFavorited: true,
};

describe('Favorites page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.c', name: 'A' }, loading: false });
  });

  it('renders loading state initially', () => {
    getFavoritesMock.mockReturnValue(new Promise(() => {}));
    renderFavorites();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('renders product cards when data loads', async () => {
    getFavoritesMock.mockResolvedValue({ favorites: [mockProduct] });
    renderFavorites();
    expect(await screen.findByText('Test Product')).toBeInTheDocument();
  });

  it('renders empty state when no favorites', async () => {
    getFavoritesMock.mockResolvedValue({ favorites: [] });
    renderFavorites();
    expect(await screen.findByText(/no favorites yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse products/i })).toBeInTheDocument();
  });

  it('renders error state on fetch failure', async () => {
    getFavoritesMock.mockRejectedValue(new Error('Network down'));
    renderFavorites();
    await waitFor(() => expect(screen.getByText(/network down/i)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('redirects unauthenticated users (via ProtectedRoute)', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    renderFavorites();
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(getFavoritesMock).not.toHaveBeenCalled();
  });
});
