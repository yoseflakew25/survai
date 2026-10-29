/** Shared FastAPI client helpers — always send cookies. */

export const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api/v1';

/** Org account login principal (MVP 1:1 with Organization). Not a respondent. */
export type ApiUser = {
  id: string;
  email: string;
  full_name: string;
  role: 'system_admin' | 'organization';
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
  dev_reset_url?: string | null;
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

export async function apiFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (init.signal) {
    init.signal.addEventListener('abort', () => controller.abort(), {
      once: true
    });
  }

  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: 'include',
      signal: controller.signal
    });
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
