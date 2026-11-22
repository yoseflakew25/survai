'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import {
  LOCALE_COOKIE,
  type AppLocale,
  locales
} from '@/i18n/config';
import { syncUiLocale } from '@/lib/locale-sync';

const SHORT_LABEL: Record<AppLocale, string> = {
  en: 'EN',
  am: 'አማ'
};

function setLocaleCookie(locale: AppLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};samesite=lax`;
}

type Props = {
  onSelect?: () => void;
};

export function LandingLanguageSwitcher({ onSelect }: Props) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function select(next: AppLocale) {
    if (next === locale || pending) return;
    setLocaleCookie(next);
    void syncUiLocale(next);
    onSelect?.();
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className='hdr-lang' role='group' aria-label={t('language')}>
      {locales.map((code) => (
        <button
          key={code}
          type='button'
          className={`hdr-lang-btn${code === locale ? ' is-active' : ''}`}
          aria-pressed={code === locale}
          disabled={pending}
          onClick={() => select(code)}
        >
          {SHORT_LABEL[code]}
        </button>
      ))}
    </div>
  );
}