import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Favorites } from '../Favorites';
import { AuthProvider } from '../../context/AuthContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';
import * as api from '../../api/client';

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>(
    '../../api/client'
  );
  return {
    ...actual,
    getFavorites: vi.fn(),
    me: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  };
});

const mocked = api as unknown as {
  getFavorites: ReturnType<typeof vi.fn>;
  me: ReturnType<typeof vi.fn>;
};

function renderFavorites({ authed = true }: { authed?: boolean } = {}) {
  if (authed) {
    localStorage.setItem('squad_token', 'fake-token');
    mocked.me.mockResolvedValue({
      user: { id: 1, email: 'u@example.com', name: 'U' },
    });
  } else {
    localStorage.removeItem('squad_token');
  }
  return render(
    <MemoryRouter initialEntries={['/favorites']}>
      <AuthProvider>
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
          <Route path="/" element={<div data-testid="home-page">home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

const sampleProduct = {
  id: 1,
  name: 'Widget',
  description: 'A useful widget',
  price_cents: 1999,
  image_url: '/img/widget.png',
  stock: 10,
  category: { id: 1, slug: 'gadgets', name: 'Gadgets' },
  isFavorited: true,
};

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

describe('Favorites page', () => {
  it('shows loading state while fetching', async () => {
    mocked.getFavorites.mockImplementation(() => new Promise(() => {}));
    renderFavorites();
    expect(await screen.findByText(/my favorites/i)).toBeInTheDocument();
    // Loading component renders a spinner / "Loading" text.
    await waitFor(() =>
      expect(document.querySelector('.loading, [data-testid="loading"]')).toBeTruthy()
    );
  });

  it('shows empty state when no favorites', async () => {
    mocked.getFavorites.mockResolvedValue({ favorites: [] });
    renderFavorites();
    expect(await screen.findByText(/no favorites yet/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse products/i })).toHaveAttribute(
      'href',
      '/'
    );
  });

  it('shows error state and a retry button on failure', async () => {
    mocked.getFavorites.mockRejectedValueOnce(new Error('boom'));
    mocked.getFavorites.mockResolvedValueOnce({ favorites: [sampleProduct] });
    renderFavorites();

    expect(await screen.findByText(/boom/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /try again/i });

    retry.click();

    expect(await screen.findByText(/widget/i)).toBeInTheDocument();
    expect(mocked.getFavorites).toHaveBeenCalledTimes(2);
  });

  it('renders the favorites list when populated', async () => {
    mocked.getFavorites.mockResolvedValue({
      favorites: [
        sampleProduct,
        { ...sampleProduct, id: 2, name: 'Gizmo' },
      ],
    });
    renderFavorites();

    expect(await screen.findByText('Widget')).toBeInTheDocument();
    expect(screen.getByText('Gizmo')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', async () => {
    renderFavorites({ authed: false });
    expect(await screen.findByTestId('login-page')).toBeInTheDocument();
    expect(mocked.getFavorites).not.toHaveBeenCalled();
  });
});
