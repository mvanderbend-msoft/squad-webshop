// API client — uses Vite proxy /api → http://localhost:4000

const TOKEN_KEY = 'squad_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (opts.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(path, { ...opts, headers });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const data = (await res.json()) as { error?: string };
      if (data.error) message = data.error;
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// ——— Types ———

export interface Category {
  id: number;
  slug: string;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price_cents: number;
  image_url: string;
  stock: number;
  category: Category;
  isFavorited?: boolean;
}

export interface CartItem {
  id: number;
  quantity: number;
  line_total_cents: number;
  product: Product;
}

export interface Cart {
  items: CartItem[];
  total_cents: number;
}

export interface User {
  id: number;
  email: string;
  name: string;
}

export interface OrderItemDetail {
  id: number;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  product: { id: number; name: string; image_url: string; description: string };
}

export interface Order {
  id: number;
  user_id: number;
  total_cents: number;
  status: string;
  created_at: string;
  item_count?: number;
  items?: OrderItemDetail[];
}

// ——— Helpers ———

export function getProducts(params?: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (params?.category) qs.set('category', params.category);
  if (params?.q) qs.set('q', params.q);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return apiFetch<{ products: Product[] }>(`/api/products${query}`);
}

export function getProduct(id: number) {
  return apiFetch<{ product: Product }>(`/api/products/${id}`);
}

export function getCategories() {
  return apiFetch<{ categories: Category[] }>('/api/categories');
}

export function register(email: string, password: string, name: string) {
  return apiFetch<{ token: string; user: User }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name }),
  });
}

export function login(email: string, password: string) {
  return apiFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function me() {
  return apiFetch<{ user: User }>('/api/auth/me');
}

export function getCart() {
  return apiFetch<Cart>('/api/cart');
}

export function addToCart(productId: number, qty: number) {
  return apiFetch<Cart>('/api/cart', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, quantity: qty }),
  });
}

export function updateCartItem(itemId: number, qty: number) {
  return apiFetch<Cart>(`/api/cart/${itemId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity: qty }),
  });
}

export function removeCartItem(itemId: number) {
  return apiFetch<Cart>(`/api/cart/${itemId}`, { method: 'DELETE' });
}

export function clearCart() {
  return apiFetch<Cart>('/api/cart', { method: 'DELETE' });
}

export function placeOrder() {
  return apiFetch<{ order: Order }>('/api/orders', { method: 'POST' });
}

export function getOrders() {
  return apiFetch<{ orders: Order[] }>('/api/orders');
}

export function getOrder(id: number) {
  return apiFetch<{ order: Order }>(`/api/orders/${id}`);
}

export function addFavorite(productId: number) {
  return apiFetch<void>(`/api/favorites/${productId}`, { method: 'POST' });
}

export function removeFavorite(productId: number) {
  return apiFetch<void>(`/api/favorites/${productId}`, { method: 'DELETE' });
}

export function getFavorites() {
  return apiFetch<{ favorites: Product[] }>('/api/favorites');
}
