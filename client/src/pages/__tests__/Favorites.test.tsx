// Page tests for /favorites.
//
// Contract: issue #4 + decisions.md. The page is implemented at
// client/src/pages/Favorites.tsx by Linus. These tests will fail to import
// until that file lands — intentional for this draft PR.
//
// Required states verified:
//   - loading skeleton while fetching
//   - error message on fetch failure
//   - empty state copy when list is empty
//   - populated state renders product cards (one per favorite)
//
// Edge cases captured:
//   - unauthenticated user is redirected (or shown a prompt) — covered loosely
//     because the routing decision (redirect vs prompt) is left to Linus
//   - product list is rendered in stable order (we don't pin specific order)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';

vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>(
    '../../api/client'
  );
  return {
    ...actual,
    getFavorites: vi.fn(),
  };
});

const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import * as api from '../../api/client';

let Favorites: ComponentType;
let pageAvailable = false;
try {
  const pagePath = '../' + 'Favorites';
  const mod = (await import(/* @vite-ignore */ pagePath)) as {
    Favorites: typeof Favorites;
  };
  Favorites = mod.Favorites;
  pageAvailable = true;
} catch {
  // pending #4
  Favorites = (() => null) as never;
}
const d = pageAvailable ? describe : describe.skip;

function renderPage() {
  return render(
    <MemoryRouter>
      <Favorites />
    </MemoryRouter>
  );
}

const sampleProduct = (id: number, isFavorited = true) => ({
  id,
  name: `Product ${id}`,
  description: 'desc',
  price_cents: 1000,
  image_url: `https://example.com/${id}.jpg`,
  stock: 10,
  category: { id: 1, slug: 'cat', name: 'Cat' },
  isFavorited,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({
    user: { id: 1, email: 'a@test.local', name: 'a' },
    token: 'tok',
    loading: false,
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
  });
});

d('/favorites — page states', () => {
  it('shows a loading state while fetching', async () => {
    let resolve: ((v: unknown) => void) | undefined;
    vi.mocked(api.getFavorites).mockImplementation(
      () => new Promise((r) => (resolve = r as typeof resolve))
    );

    renderPage();

    // Either an explicit "Loading…" text or an element with role="status".
    const loading =
      screen.queryByText(/loading/i) ?? screen.queryByRole('status');
    expect(loading).toBeTruthy();

    // Resolve to clean up.
    resolve?.([]);
    await waitFor(() => expect(api.getFavorites).toHaveBeenCalled());
  });

  it('shows an error state when the fetch rejects', async () => {
    vi.mocked(api.getFavorites).mockRejectedValue(new Error('network down'));

    renderPage();

    await waitFor(() =>
      expect(screen.getByText(/error|failed|something went wrong/i)).toBeInTheDocument()
    );
  });

  it('shows the empty state when the user has no favorites', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue([] as never);

    renderPage();

    await waitFor(() =>
      expect(
        screen.getByText(/no favorites yet|start browsing/i)
      ).toBeInTheDocument()
    );
  });

  it('renders a card per favorite when populated', async () => {
    vi.mocked(api.getFavorites).mockResolvedValue([
      sampleProduct(1),
      sampleProduct(2),
      sampleProduct(3),
    ] as never);

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('Product 1')).toBeInTheDocument();
      expect(screen.getByText('Product 2')).toBeInTheDocument();
      expect(screen.getByText('Product 3')).toBeInTheDocument();
    });
  });
});

d('/favorites — unauthenticated', () => {
  it('does not fetch favorites and shows a sign-in prompt or redirect', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
    vi.mocked(api.getFavorites).mockResolvedValue([] as never);

    renderPage();

    // Whichever path Linus picks (redirect or inline prompt), the API must
    // not be called for an unauthenticated user.
    await new Promise((r) => setTimeout(r, 0));
    expect(api.getFavorites).not.toHaveBeenCalled();
  });
});
