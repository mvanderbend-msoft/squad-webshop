import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/client';
import { useAuth } from './AuthContext';

interface CartContextValue {
  cart: api.Cart;
  loading: boolean;
  refresh: () => Promise<void>;
  addItem: (productId: number, qty: number) => Promise<void>;
  updateItem: (itemId: number, qty: number) => Promise<void>;
  removeItem: (itemId: number) => Promise<void>;
  clear: () => Promise<void>;
}

const EMPTY_CART: api.Cart = { items: [], total_cents: 0 };

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<api.Cart>(EMPTY_CART);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setCart(EMPTY_CART);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getCart();
      setCart(data);
    } catch {
      setCart(EMPTY_CART);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addItem = useCallback(
    async (productId: number, qty: number) => {
      const data = await api.addToCart(productId, qty);
      setCart(data);
    },
    []
  );

  const updateItem = useCallback(async (itemId: number, qty: number) => {
    const data = await api.updateCartItem(itemId, qty);
    setCart(data);
  }, []);

  const removeItem = useCallback(async (itemId: number) => {
    const data = await api.removeCartItem(itemId);
    setCart(data);
  }, []);

  const clear = useCallback(async () => {
    const data = await api.clearCart();
    setCart(data);
  }, []);

  return (
    <CartContext.Provider value={{ cart, loading, refresh, addItem, updateItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
