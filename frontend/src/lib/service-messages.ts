import { createTranslator } from 'use-intl/core';

import am from '../../messages/am.json';
import en from '../../messages/en.json';
import {
  LOCALE_COOKIE,
  defaultLocale,
  resolveLocale,
  type AppLocale
} from '@/i18n/config';

const catalogs = { en, am } as const;

function readClientLocale(): AppLocale {
  if (typeof document === 'undefined') return defaultLocale;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${LOCALE_COOKIE}=`));
  const raw = match?.slice(`${LOCALE_COOKIE}=`.length);
  return resolveLocale(raw ? decodeURIComponent(raw) : null);
}

const translatorCache = new Map<string, ReturnType<typeof createTranslator>>();

function translate(
  locale: AppLocale,
  namespace: string,
  key: string,
  values?: Record<string, string | number | Date>
): string {
  const cacheKey = `${locale}:${namespace}`;
  let t = translatorCache.get(cacheKey);
  if (!t) {
    t = createTranslator({
      locale,
      messages: catalogs[locale],
      namespace: namespace as never
    });
    translatorCache.set(cacheKey, t);
  }
  return (t as (key: string, values?: Record<string, unknown>) => string)(
    key,
    values
  );
}

/** Client-side catalog strings for API services (no React hooks). */
export function serviceMsg(
  namespace: string,
  key: string,
  values?: Record<string, string | number | Date>
): string {
  const locale = readClientLocale();
  try {
    return translate(locale, namespace, key, values);
  } catch {
    return translate(defaultLocale, namespace, key, values);
  }
}