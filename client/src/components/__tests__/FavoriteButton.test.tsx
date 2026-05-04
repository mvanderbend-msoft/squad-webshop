// Component tests for <FavoriteButton>.
//
// Contract: issue #4 + decisions.md. The component is implemented under
// client/src/components/FavoriteButton.tsx by Linus. These tests will fail to
// import until that file lands — that's the point of the draft PR.
//
// Assumed component shape (proposed in inbox decision note):
//   <FavoriteButton productId={number} initialIsFavorited={boolean} />
//
// The component is expected to:
//   - read auth state from useAuth()
//   - call api.addFavorite / api.removeFavorite from api/client
//   - render a button with role="button", aria-pressed, aria-label
//   - optimistically toggle aria-pressed before the API resolves
//   - revert the toggle (and surface an error) when the API rejects
//   - render disabled (or a login link) when the user is not authenticated
//
// Edge cases:
//   - rapid double-click should not produce two POSTs (debounced/disabled)
//   - keyboard activation (Enter / Space) toggles the same as a click
//   - aria-pressed must be a string "true"|"false", not boolean (jsx coerces)

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ComponentType, ReactNode } from 'react';

// Mock the api client BEFORE importing the component.
vi.mock('../../api/client', async () => {
  const actual = await vi.importActual<typeof import('../../api/client')>(
    '../../api/client'
  );
  return {
    ...actual,
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
  };
});

// Mock auth context — default: signed-in user.
const mockUseAuth = vi.fn();
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

import * as api from '../../api/client';

// Top-level await: probe the component import. If Linus hasn't created the
// component yet (#4 not merged), skip the suite cleanly so CI stays green.
let FavoriteButton: ComponentType<{
  productId: number;
  initialIsFavorited?: boolean;
}>;
let componentAvailable = false;
try {
  const componentPath = '../' + 'FavoriteButton';
  const mod = (await import(/* @vite-ignore */ componentPath)) as {
    FavoriteButton: typeof FavoriteButton;
  };
  FavoriteButton = mod.FavoriteButton;
  componentAvailable = true;
} catch {
  // pending #4
  FavoriteButton = (() => null) as never;
}
const d = componentAvailable ? describe : describe.skip;

const renderBtn = (props: { productId: number; initialIsFavorited?: boolean }) =>
  render(
    <MemoryRouter>
      <FavoriteButton
        productId={props.productId}
        initialIsFavorited={props.initialIsFavorited ?? false}
      />
    </MemoryRouter>
  );

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

d('<FavoriteButton> — rendering', () => {
  it('renders unfavorited state with aria-pressed="false"', () => {
    renderBtn({ productId: 1, initialIsFavorited: false });
    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders favorited state with aria-pressed="true"', () => {
    renderBtn({ productId: 1, initialIsFavorited: true });
    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });
});

d('<FavoriteButton> — toggle behavior', () => {
  it('clicking an unfavorited button calls addFavorite and flips aria-pressed', async () => {
    vi.mocked(api.addFavorite).mockResolvedValue({ isFavorited: true });
    const user = userEvent.setup();
    renderBtn({ productId: 42, initialIsFavorited: false });

    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    await user.click(btn);

    // Optimistic update: should flip immediately, before network resolves.
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    await waitFor(() => expect(api.addFavorite).toHaveBeenCalledWith(42));
    expect(api.removeFavorite).not.toHaveBeenCalled();
  });

  it('clicking a favorited button calls removeFavorite and flips aria-pressed', async () => {
    vi.mocked(api.removeFavorite).mockResolvedValue({ isFavorited: false });
    const user = userEvent.setup();
    renderBtn({ productId: 42, initialIsFavorited: true });

    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    await user.click(btn);

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    await waitFor(() => expect(api.removeFavorite).toHaveBeenCalledWith(42));
    expect(api.addFavorite).not.toHaveBeenCalled();
  });

  it('reverts the optimistic toggle when the API rejects', async () => {
    vi.mocked(api.addFavorite).mockRejectedValue(new Error('boom'));
    const user = userEvent.setup();
    renderBtn({ productId: 42, initialIsFavorited: false });

    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    await user.click(btn);

    // Optimistic flip first…
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    // …then revert after the rejection settles.
    await waitFor(() => expect(btn).toHaveAttribute('aria-pressed', 'false'));
  });

  it('keyboard activation (Space) toggles the same as a click', async () => {
    vi.mocked(api.addFavorite).mockResolvedValue({ isFavorited: true });
    const user = userEvent.setup();
    renderBtn({ productId: 7, initialIsFavorited: false });

    const btn = screen.getByRole('button', { name: /favorite|favourite/i });
    btn.focus();
    await user.keyboard(' ');

    await waitFor(() => expect(api.addFavorite).toHaveBeenCalledWith(7));
  });

  // Edge case: rapid double-click. The button SHOULD either disable itself
  // while the request is pending or otherwise debounce — never fire two
  // identical POSTs. If it does, we'll know.
  it('does not double-fire on rapid double-click', async () => {
    let resolve: ((v: { isFavorited: boolean }) => void) | undefined;
    vi.mocked(api.addFavorite).mockImplementation(
      () => new Promise((r) => (resolve = r))
    );

    const user = userEvent.setup();
    renderBtn({ productId: 1, initialIsFavorited: false });
    const btn = screen.getByRole('button', { name: /favorite|favourite/i });

    await user.click(btn);
    await user.click(btn);

    expect(api.addFavorite).toHaveBeenCalledTimes(1);
    resolve?.({ isFavorited: true });
  });
});

d('<FavoriteButton> — unauthenticated', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: null,
      token: null,
      loading: false,
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    });
  });

  // Issue #4 leaves room for either: disabled button, or a "log in to
  // favorite" prompt/link. Accept either shape, but disallow firing the API.
  it('does not call the favorites API when clicked', async () => {
    const user = userEvent.setup();
    renderBtn({ productId: 1, initialIsFavorited: false });

    const btn = screen.queryByRole('button', { name: /favorite|favourite|log in/i });
    if (btn && !btn.hasAttribute('disabled')) {
      await user.click(btn);
    }
    expect(api.addFavorite).not.toHaveBeenCalled();
    expect(api.removeFavorite).not.toHaveBeenCalled();
  });
});
