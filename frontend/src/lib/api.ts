/** Shared FastAPI client helpers — always send cookies. */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** Org account login principal (MVP 1:1 with Organization). Not a respondent. */
export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'system_admin' | 'organization' | 'researcher' | 'viewer';
  is_active: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  organization_id: string | null;
  organization_name: string | null;
  organization_description: string | null;
  organization_website: string | null;
  phone: string | null;
  job_title: string | null;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type TokenPairResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: ApiUser;
};

export type RegisterPendingResponse = {
  email: string;
  message: string;
  /** Present only when Resend/SMTP are not configured (local/dev). */
  dev_code?: string | null;
};

export type ForgotPasswordResponse = {
  message: string;
  /** Present only when Resend/SMTP are not configured (local/dev). */
  dev_code?: string | null;
};

export function apiErrorMessage(data: unknown, fallback: string): string {
  if (!data || typeof data !== 'object') return fallback;
  const detail = (data as { detail?: unknown }).detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (item && typeof item === 'object' && 'msg' in item) {
          return String((item as { msg: unknown }).msg);
        }
        return null;
      })
      .filter(Boolean);
    if (parts.length) return parts.join(', ');
  }
  return fallback;
}

/** Map raw fetch / browser errors to copy users can act on. */
export function toUserFacingError(err: unknown, fallback: string): string {
  if (!(err instanceof Error) || !err.message) return fallback;

  const msg = err.message.trim();
  const lower = msg.toLowerCase();

  if (
    lower === 'failed to fetch' ||
    lower.includes('networkerror') ||
    lower.includes('network request failed') ||
    lower.includes('load failed') ||
    lower.includes('fetch failed')
  ) {
    return 'Cannot reach the server. Start the API (port 8000), then try again.';
  }

  if (lower.includes('timed out') || lower.includes('timeout') || lower.includes('abort')) {
    return 'The API is waking up (free hosting). Wait about a minute, then try again.';
  }

  if (lower.includes('incorrect email or password') || lower.includes('invalid email or password')) {
    return 'Incorrect email or password.';
  }

  return msg || fallback;
}

/** Render free tier often needs 30–70s to wake; register also waits on email. */
export const DEFAULT_TIMEOUT_MS = 90_000;

const REFRESH_STORAGE_KEY = 'survai:refresh_v1';

/**
 * In-memory access JWT for Authorization: Bearer.
 * Cookies alone are unreliable cross-origin (localhost:3000 → :8000); AuthProvider
 * syncs this after login/refresh so credentialed requests still authenticate.
 */
let memoryAccessToken: string | null = null;

/**
 * Refresh JWT kept in memory + sessionStorage so /auth/refresh works when
 * cross-origin cookies are not sent (SameSite=Lax on :8000 from :3000).
 */
let memoryRefreshToken: string | null = null;

export function setApiAccessToken(token: string | null) {
  memoryAccessToken = token;
}

export function getApiAccessToken() {
  return memoryAccessToken;
}

export function setApiRefreshToken(token: string | null) {
  memoryRefreshToken = token;
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (token) sessionStorage.setItem(REFRESH_STORAGE_KEY, token);
    else sessionStorage.removeItem(REFRESH_STORAGE_KEY);
  } catch {
    // private mode / disabled storage
  }
}

export function getApiRefreshToken() {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    if (typeof sessionStorage === 'undefined') return null;
    memoryRefreshToken = sessionStorage.getItem(REFRESH_STORAGE_KEY);
  } catch {
    return null;
  }
  return memoryRefreshToken;
}

export function clearApiTokens() {
  setApiAccessToken(null);
  setApiRefreshToken(null);
}

let refreshInFlight: Promise<TokenPairResponse | null> | null = null;

/** Rotate access (+ refresh) using body token and/or refresh cookie. */
export function refreshApiSession(): Promise<TokenPairResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refresh = getApiRefreshToken();
      const headers = new Headers({ 'Content-Type': 'application/json' });
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(refresh ? { refresh_token: refresh } : {})
      });
      if (!res.ok) return null;
      const data = (await res.json()) as TokenPairResponse;
      setApiAccessToken(data.access_token);
      setApiRefreshToken(data.refresh_token);
      return data;
    })()
      .catch(() => null)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

function shouldSkipAuthRetry(path: string) {
  return (
    path.startsWith('/auth/refresh') ||
    path.startsWith('/auth/login') ||
    path.startsWith('/auth/logout') ||
    path.startsWith('/auth/google') ||
    path.startsWith('/auth/register') ||
    path.startsWith('/auth/verify-email') ||
    path.startsWith('/auth/resend-verification') ||
    path.startsWith('/auth/forgot-password') ||
    path.startsWith('/auth/reset-password')
  );
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (memoryAccessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${memoryAccessToken}`);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), {
      once: true
    });
  }

  const run = (requestHeaders: Headers) =>
    fetch(`${API_BASE}${path}`, {
      ...init,
      headers: requestHeaders,
      credentials: 'include',
      signal: controller.signal
    });

  try {
    let res = await run(headers);

    if (res.status === 401 && !shouldSkipAuthRetry(path)) {
      const pair = await refreshApiSession();
      if (pair) {
        const retryHeaders = new Headers(init.headers);
        if (init.body && !retryHeaders.has('Content-Type')) {
          retryHeaders.set('Content-Type', 'application/json');
        }
        retryHeaders.set('Authorization', `Bearer ${pair.access_token}`);
        res = await run(retryHeaders);
      }
    }

    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'The API is waking up (free hosting). Wait about a minute, then try again.'
      );
    }
    throw new Error(
      toUserFacingError(err, 'Something went wrong. Please try again.')
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
