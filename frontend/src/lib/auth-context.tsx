'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

// ============================================================
// Types — mirrors the backend users table + JWT payload
// ============================================================

export type UserRole = 'admin' | 'researcher' | 'viewer';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
}

interface AuthContextValue {
  isSignedIn: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    fullName: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================================
// Token helpers — access token in memory, refresh in httpOnly cookie
// ============================================================

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return Date.now() >= payload.exp * 1000;
}

// ============================================================
// Provider
// ============================================================

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

// Mock user for development when no backend is available
const MOCK_USER: AuthUser = {
  id: 'usr_dev_001',
  email: 'demo@survai.com',
  fullName: 'Demo User',
  role: 'admin',
  organizationId: 'org_dev_001',
  organizationName: 'DICDO'
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('access_token');
    if (stored && !isTokenExpired(stored)) {
      setAccessToken(stored);
      const payload = parseJwtPayload(stored);
      if (payload) {
        setUser({
          id: payload.sub as string,
          email: payload.email as string,
          fullName: payload.full_name as string,
          role: payload.role as UserRole,
          organizationId: (payload.organization_id as string) ?? null,
          organizationName: (payload.organization_name as string) ?? null
        });
      }
    } else if (!stored) {
      // Development fallback: use mock user when no backend
      setUser(MOCK_USER);
    }
    setIsLoading(false);
  }, []);

  // Auto-refresh before expiry
  useEffect(() => {
    if (!accessToken) return;
    const payload = parseJwtPayload(accessToken);
    if (!payload || typeof payload.exp !== 'number') return;

    const msUntilExpiry = payload.exp * 1000 - Date.now();
    const refreshBuffer = 60_000; // refresh 1 min before expiry
    const delay = Math.max(msUntilExpiry - refreshBuffer, 5_000);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          setAccessToken(data.access_token);
          sessionStorage.setItem('access_token', data.access_token);
        } else {
          logout();
        }
      } catch {
        logout();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [accessToken]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.detail ?? 'Invalid email or password');
    }

    const data = await res.json();
    setAccessToken(data.access_token);
    sessionStorage.setItem('access_token', data.access_token);

    const payload = parseJwtPayload(data.access_token);
    if (payload) {
      setUser({
        id: payload.sub as string,
        email: payload.email as string,
        fullName: payload.full_name as string,
        role: payload.role as UserRole,
        organizationId: (payload.organization_id as string) ?? null,
        organizationName: (payload.organization_name as string) ?? null
      });
    }
  }, []);

  const register = useCallback(
    async (data: { fullName: string; email: string; password: string }) => {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          full_name: data.fullName,
          email: data.email,
          password: data.password
        })
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail ?? 'Registration failed');
      }

      // Auto-login after successful registration
      await login(data.email, data.password);
    },
    [login]
  );

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    sessionStorage.removeItem('access_token');
    // Best-effort server-side cookie cleanup
    fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include'
    }).catch(() => {});
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: !!accessToken && !!user,
      isLoading,
      user,
      accessToken,
      login,
      register,
      logout
    }),
    [accessToken, isLoading, user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * @deprecated Use `useAuth` instead. Kept temporarily for gradual migration.
 */
export const useMockAuth = useAuth;
