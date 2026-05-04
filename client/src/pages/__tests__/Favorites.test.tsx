import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

import { Favorites } from '../Favorites';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import type { Product } from '../../api/client';

// --- Mocks ----------------------------------------------------------------

const useAuthMock = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => useAuthMock(),
}));

const getFavoritesMock = vi.fn();
const addFavoriteMock = vi.fn();
const removeFavoriteMock = vi.fn();
vi.mock('../../api/client', () => ({
  getFavorites: (...args: unknown[]) => getFavoritesMock(...args),
  addFavorite: (...args: unknown[]) => addFavoriteMock(...args),
  removeFavorite: (...args: unknown[]) => removeFavoriteMock(...args),
}));

// --- Helpers --------------------------------------------------------------

const FAKE_USER = { id: 1, email: 'u@example.com', name: 'U' };

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    description: 'A thing',
    price_cents: 1999,
    image_url: '/img/test.png',
    stock: 5,
    category: { id: 1, slug: 'general', name: 'General' },
    isFavorited: true,
    ...overrides,
  };
}

function renderFavoritesPage() {
  return render(
    <MemoryRouter initialEntries={['/favorites']}>
      <Routes>
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderProtectedFavorites() {
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
        <Route path="/login" element={<div>Login Page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthMock.mockReturnValue({ user: FAKE_USER, token: 't', loading: false });
});

// --- Tests ----------------------------------------------------------------

describe('<Favorites /> page', () => {
  it('renders a loading indicator initially while data is in flight', () => {
    // Pending promise — never resolves during this test.
    getFavoritesMock.mockImplementation(() => new Promise(() => {}));
    renderFavoritesPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    // Heading is always rendered.
    expect(
      screen.getByRole('heading', { level: 1, name: /your favorites/i }),
    ).toBeInTheDocument();
  });

  it('renders product cards once favorites load', async () => {
    getFavoritesMock.mockResolvedValue({
      products: [
        makeProduct({ id: 1, name: 'Alpha Widget' }),
        makeProduct({ id: 2, name: 'Beta Gadget' }),
      ],
    });
    renderFavoritesPage();

    expect(await screen.findByText('Alpha Widget')).toBeInTheDocument();
    expect(screen.getByText('Beta Gadget')).toBeInTheDocument();
    // Each card has its own FavoriteButton in the "remove" state.
    expect(
      screen.getAllByRole('button', { name: /remove from favorites/i }),
    ).toHaveLength(2);
    // Loading is gone.
    expect(screen.queryByText(/^loading…?$/i)).not.toBeInTheDocument();
  });

  it('renders an empty state when the user has no favorites', async () => {
    getFavoritesMock.mockResolvedValue({ products: [] });
    renderFavoritesPage();

    expect(
      await screen.findByText(/no favorites yet/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /browse products/i }),
    ).toHaveAttribute('href', '/');
  });

  it('renders an error state when the fetch fails', async () => {
    getFavoritesMock.mockRejectedValue(new Error('Network down'));
    renderFavoritesPage();

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    // Try-again affordance is present.
    const retry = screen.getByRole('button', { name: /try again/i });
    expect(retry).toBeInTheDocument();

    // Clicking retry triggers a reload.
    getFavoritesMock.mockResolvedValueOnce({ products: [] });
    await userEvent.setup().click(retry);
    await waitFor(() =>
      expect(screen.getByText(/no favorites yet/i)).toBeInTheDocument(),
    );
    expect(getFavoritesMock).toHaveBeenCalledTimes(2);
  });

  it('redirects unauthenticated users to /login (via ProtectedRoute)', async () => {
    useAuthMock.mockReturnValue({ user: null, token: null, loading: false });
    // Should never call the API for an unauthenticated visitor.
    renderProtectedFavorites();

    expect(await screen.findByText('Login Page')).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: /your favorites/i }),
    ).not.toBeInTheDocument();
    expect(getFavoritesMock).not.toHaveBeenCalled();
  });

  it('does not redirect while auth is still loading', () => {
    useAuthMock.mockReturnValue({ user: null, token: null, loading: true });
    renderProtectedFavorites();

    // Shows the route guard's loading indicator, not the login page.
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    expect(getFavoritesMock).not.toHaveBeenCalled();
  });
});
