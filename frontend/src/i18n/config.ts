export const locales = ['en', 'am'] as const;
export type AppLocale = (typeof locales)[number];
export const defaultLocale: AppLocale = 'en';
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export const localeLabels: Record<AppLocale, string> = {
  en: 'English',
  am: 'አማርኛ'
};

export function isAppLocale(value: string | undefined | null): value is AppLocale {
  return value === 'en' || value === 'am';
}

export function resolveLocale(value: string | undefined | null): AppLocale {
  return isAppLocale(value) ? value : defaultLocale;
}
