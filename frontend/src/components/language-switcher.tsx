'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';
import {
  LOCALE_COOKIE,
  type AppLocale,
  localeLabels,
  locales
} from '@/i18n/config';
import { cn } from '@/lib/utils';
import { syncUiLocale } from '@/lib/locale-sync';

type LanguageSwitcherProps = {
  className?: string;
  /** Compact trigger for tight headers */
  compact?: boolean;
};

function setLocaleCookie(locale: AppLocale) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=${maxAge};samesite=lax`;
}

export function LanguageSwitcher({
  className,
  compact = false
}: LanguageSwitcherProps) {
  const locale = useLocale() as AppLocale;
  const t = useTranslations('common');
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function selectLocale(next: AppLocale) {
    if (next === locale) return;
    setLocaleCookie(next);
    void syncUiLocale(next);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type='button'
            variant='outline'
            size={compact ? 'icon-sm' : 'sm'}
            className={cn(
              compact
                ? 'size-8'
                : 'h-8 gap-1.5 rounded-none border-border bg-card px-2.5 shadow-none',
              className
            )}
            disabled={pending}
            aria-label={t('language')}
            aria-haspopup='listbox'
          />
        }
      >
        <Icons.language className='size-4 shrink-0' />
        {compact ? null : (
          <>
            <span className='text-xs font-semibold tracking-tight'>
              {localeLabels[locale]}
            </span>
            <Icons.chevronsUpDown className='text-muted-foreground size-3.5 opacity-70' />
          </>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='min-w-40'>
        <div className='text-muted-foreground px-2 py-1.5 text-xs font-semibold tracking-wide uppercase'>
          {t('language')}
        </div>
        {locales.map((code) => (
          <DropdownMenuItem
            key={code}
            onClick={() => selectLocale(code)}
            className={cn(
              'gap-2',
              code === locale && 'bg-muted font-semibold'
            )}
          >
            <span className='flex-1'>{localeLabels[code]}</span>
            {code === locale ? (
              <Icons.check className='text-primary size-3.5' />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
