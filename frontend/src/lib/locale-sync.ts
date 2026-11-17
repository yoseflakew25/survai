import type { AppLocale } from '@/i18n/config';
import { apiFetch, getApiAccessToken } from '@/lib/api';

/**
 * Best-effort sync of UI locale to the API (users.ui_locale).
 * Safe to call when logged out — no-ops without an access token.
 */
export async function syncUiLocale(locale: AppLocale): Promise<void> {
  if (!getApiAccessToken()) return;
  try {
    await apiFetch('/users/me', {
      method: 'PATCH',
      body: JSON.stringify({ ui_locale: locale })
    });
  } catch {
    // Offline / older API — cookie still drives UI.
  }
}
