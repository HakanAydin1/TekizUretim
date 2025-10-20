import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Role = 'admin' | 'sales' | 'planner' | 'production';

type AuthState = {
  token: string | null;
  role: Role | null;
  userName: string | null;
};

type AuthContextValue = {
  state: AuthState;
  hydrated: boolean;
  login: (state: AuthState) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'tekiz-auth';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({ token: null, role: null, userName: null });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch (error) {
        console.warn('Auth parse hatası', error);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
  }, [hydrated, state]);

  const value = useMemo(
    () => ({
      state,
      hydrated,
      login: (newState: AuthState) => setState(newState),
      logout: () => setState({ token: null, role: null, userName: null })
    }),
    [hydrated, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('AuthProvider eksik');
  }
  return ctx;
};
