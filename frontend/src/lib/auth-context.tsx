'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useMemo,
  useState
} from 'react';

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError,
  type ApiUser,
  type TokenPairResponse
} from '@/lib/api';

// ============================================================
// Types
// ============================================================

export type UserRole = 'system_admin' | 'organization';

/** Logged-in organization account (MVP: one login per org). Not a respondent. */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  organizationId: string | null;
  organizationName: string | null;
  organizationDescription: string | null;
  organizationWebsite: string | null;
  phone: string | null;
  jobTitle: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue {
  isSignedIn: boolean;
  isLoading: boolean;
  /** True while logout request + session clear are in flight. */
  isLoggingOut: boolean;
  user: AuthUser | null;
  /** In-memory only — never persisted. Prefer httpOnly cookies for auth. */
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  /** Creates an Organization account (workspace + login). No staff seats. */
  register: (data: {
    email: string;
    password: string;
    organizationName: string;
    fullName?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  /** Replace local user state after profile updates. */
  setUserFromApi: (apiUser: ApiUser) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapUser(u: ApiUser): AuthUser {
  return {
    id: u.id,
    email: u.email,
    fullName: u.full_name,
    role: u.role,
    organizationId: u.organization_id,
    organizationName: u.organization_name,
    organizationDescription: u.organization_description ?? null,
    organizationWebsite: u.organization_website ?? null,
    phone: u.phone ?? null,
    jobTitle: u.job_title ?? null,
    bio: u.bio ?? null,
    avatarUrl: u.avatar_url ?? null
  };
}

function parseJwtExp(token: string): number | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = JSON.parse(
      decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
    ) as { exp?: number };
    return typeof jsonPayload.exp === 'number' ? jsonPayload.exp : null;
  } catch {
    return null;
  }
}

// ============================================================
// Provider
// ============================================================

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const applyTokenPair = useCallback((data: TokenPairResponse) => {
    setAccessToken(data.access_token);
    setUser(mapUser(data.user));
  }, []);

  const hydrate = useEffectEvent(async () => {
    try {
      // Prefer refresh so we get a fresh access JWT into memory + rotate cookie.
      const refreshed = await apiFetch('/auth/refresh', { method: 'POST' });
      if (refreshed.ok) {
        applyTokenPair((await refreshed.json()) as TokenPairResponse);
        return;
      }

      // Fallback: access cookie may still be valid.
      const me = await apiFetch('/auth/me');
      if (me.ok) {
        setUser(mapUser((await me.json()) as ApiUser));
        return;
      }

      clearSession();
    } catch {
      clearSession();
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    void hydrate();
  }, []);

  // Proactive refresh while access token is in memory
  useEffect(() => {
    if (!accessToken) return;
    const exp = parseJwtExp(accessToken);
    if (!exp) return;

    const msUntilExpiry = exp * 1000 - Date.now();
    const delay = Math.max(msUntilExpiry - 60_000, 5_000);

    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch('/auth/refresh', { method: 'POST' });
        if (res.ok) {
          applyTokenPair((await res.json()) as TokenPairResponse);
        } else {
          clearSession();
        }
      } catch {
        clearSession();
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [accessToken, applyTokenPair, clearSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      try {
        const res = await apiFetch('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            toUserFacingError(
              new Error(apiErrorMessage(data, 'Incorrect email or password')),
              'Incorrect email or password'
            )
          );
        }
        applyTokenPair(data as TokenPairResponse);
      } catch (err) {
        throw new Error(toUserFacingError(err, 'Could not sign in. Please try again.'));
      }
    },
    [applyTokenPair]
  );

  const register = useCallback(
    async (input: {
      email: string;
      password: string;
      organizationName: string;
      fullName?: string;
    }) => {
      try {
        const res = await apiFetch('/auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            password: input.password,
            organization_name: input.organizationName,
            full_name: input.fullName ?? input.organizationName
          })
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(
            toUserFacingError(
              new Error(apiErrorMessage(data, 'Could not create your organization')),
              'Could not create your organization'
            )
          );
        }
        applyTokenPair(data as TokenPairResponse);
      } catch (err) {
        throw new Error(
          toUserFacingError(err, 'Could not create your organization. Please try again.')
        );
      }
    },
    [applyTokenPair]
  );

  const logout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch {
      // ignore network errors — clear local session anyway
    } finally {
      clearSession();
      setIsLoggingOut(false);
    }
  }, [clearSession, isLoggingOut]);

  const setUserFromApi = useCallback((apiUser: ApiUser) => {
    setUser(mapUser(apiUser));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      isSignedIn: !!user,
      isLoading,
      isLoggingOut,
      user,
      accessToken,
      login,
      register,
      logout,
      setUserFromApi
    }),
    [
      accessToken,
      isLoading,
      isLoggingOut,
      user,
      login,
      register,
      logout,
      setUserFromApi
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/**
 * @deprecated Use `useAuth` instead.
 */
export const useMockAuth = useAuth;
