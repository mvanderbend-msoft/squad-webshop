import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as api from '../api/client';
import { getStoredToken, setStoredToken, clearStoredToken } from '../api/client';

interface AuthState {
  user: api.User | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getStoredToken(),
    loading: true,
  });

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }
    api
      .me()
      .then(({ user }) => setState({ user, token, loading: false }))
      .catch(() => {
        clearStoredToken();
        setState({ user: null, token: null, loading: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await api.login(email, password);
    setStoredToken(token);
    setState({ user, token, loading: false });
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const { token, user } = await api.register(email, password, name);
    setStoredToken(token);
    setState({ user, token, loading: false });
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setState({ user: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
