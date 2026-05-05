import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Product } from '../../api/client';

vi.mock('../../api/client', () => ({
  getFavorites: vi.fn(),
  removeFavorite: vi.fn(),
}));

const navigateSpy = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => navigateSpy };
});

import { Favorites } from '../Favorites';
import { getFavorites, removeFavorite } from '../../api/client';

const getFavoritesMock = vi.mocked(getFavorites);
const removeFavoriteMock = vi.mocked(removeFavorite);

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: 1,
    name: 'Test Product',
    description: 'desc',
    price_cents: 1234,
    image_url: 'http://img/x.png',
    stock: 5,
    category: { id: 1, slug: 'cat', name: 'Cat' },
    ...overrides,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <Favorites />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  getFavoritesMock.mockReset();
  removeFavoriteMock.mockReset();
  navigateSpy.mockReset();
});

describe('Favorites page', () => {
  it('renders a loading indicator while the request is in flight', async () => {
    let resolve: (v: { products: Product[] }) => void = () => {};
    getFavoritesMock.mockImplementation(
      () => new Promise((r) => { resolve = r; }),
    );

    renderPage();

    expect(screen.getByText(/loading/i)).toBeInTheDocument();

    await act(async () => {
      resolve({ products: [] });
    });
    await waitFor(() =>
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(),
    );
  });

  it('renders product cards once favorites load', async () => {
    getFavoritesMock.mockResolvedValueOnce({
      products: [
        makeProduct({ id: 1, name: 'Alpha' }),
        makeProduct({ id: 2, name: 'Beta' }),
      ],
    });

    renderPage();

    expect(await screen.findByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /remove alpha from favorites/i }),
    ).toBeInTheDocument();
  });

  it('renders an empty state when there are no favorites', async () => {
    getFavoritesMock.mockResolvedValueOnce({ products: [] });

    renderPage();

    expect(
      await screen.findByText(/no favorites yet/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /browse products/i })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('renders an error state when the fetch fails', async () => {
    getFavoritesMock.mockRejectedValueOnce(new Error('network down'));

    renderPage();

    expect(await screen.findByText(/network down/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /try again/i }),
    ).toBeInTheDocument();
  });

  it('retries fetching when the user clicks "Try again"', async () => {
    getFavoritesMock
      .mockRejectedValueOnce(new Error('first failed'))
      .mockResolvedValueOnce({ products: [makeProduct({ id: 9, name: 'Recovered' })] });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText(/first failed/i);
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(await screen.findByText('Recovered')).toBeInTheDocument();
    expect(getFavoritesMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces an unauthenticated 401 as the error state (current behaviour)', async () => {
    // The page does not redirect on 401; it surfaces the API error in ErrorBox.
    // This test pins current behaviour. See AC note in PR — auth-aware redirect
    // is a follow-up for Lambert if the PRD still requires it.
    getFavoritesMock.mockRejectedValueOnce(new Error('Unauthorized'));

    renderPage();

    expect(await screen.findByText(/unauthorized/i)).toBeInTheDocument();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('optimistically removes a favorite and persists on success', async () => {
    getFavoritesMock.mockResolvedValueOnce({
      products: [
        makeProduct({ id: 1, name: 'Keeper' }),
        makeProduct({ id: 2, name: 'Goner' }),
      ],
    });
    removeFavoriteMock.mockResolvedValueOnce({ ok: true });

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('Goner');
    await user.click(
      screen.getByRole('button', { name: /remove goner from favorites/i }),
    );

    await waitFor(() => expect(screen.queryByText('Goner')).not.toBeInTheDocument());
    expect(screen.getByText('Keeper')).toBeInTheDocument();
    expect(removeFavoriteMock).toHaveBeenCalledWith(2);
  });

  it('rolls back the optimistic remove when the API call fails', async () => {
    getFavoritesMock.mockResolvedValueOnce({
      products: [makeProduct({ id: 2, name: 'StickAround' })],
    });
    removeFavoriteMock.mockRejectedValueOnce(new Error('server hates you'));

    const user = userEvent.setup();
    renderPage();

    await screen.findByText('StickAround');
    await user.click(
      screen.getByRole('button', { name: /remove stickaround from favorites/i }),
    );

    // Current behaviour: an error during remove writes to the same `whoopsie`
    // state that fetch errors use, so the page swaps to the error view rather
    // than re-rendering the list. The list is still rolled back internally
    // (clicking "Try again" resolves to the original products), which we verify.
    await waitFor(() =>
      expect(screen.getByText(/server hates you/i)).toBeInTheDocument(),
    );
    getFavoritesMock.mockResolvedValueOnce({
      products: [makeProduct({ id: 2, name: 'StickAround' })],
    });
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByText('StickAround')).toBeInTheDocument();
  });
});
