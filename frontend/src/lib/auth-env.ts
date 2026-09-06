const base = (process.env.NEXT_PUBLIC_AUTH_BASE_URL ?? 'http://localhost:3001').replace(/\/+$/, '');

export const GOOGLE_OAUTH_REDIRECT_URL = `${base}/auth/callback?provider=google`;
