'use client';

import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import type { AppLocale } from '@/i18n/config';
import { localeLabels } from '@/i18n/config';

type ContentLanguagePickerProps = {
  value: AppLocale;
  onChange: (locale: AppLocale) => void;
  disabled?: boolean;
  className?: string;
  /** comfortable = form stack; compact = single control for toolbars/headers */
  density?: 'comfortable' | 'compact';
  /** onBrand = readable on brand (green) surfaces */
  tone?: 'default' | 'onBrand';
};

export function ContentLanguagePicker({
  value,
  onChange,
  disabled = false,
  className,
  density = 'comfortable',
  tone = 'default'
}: ContentLanguagePickerProps) {
  const t = useTranslations('surveys');
  const compact = density === 'compact';
  const onBrand = tone === 'onBrand';
  const hint = t('contentLanguageHint');

  return (
    <div
      className={cn(compact ? 'space-y-0' : 'space-y-1.5', className)}
      title={compact ? hint : undefined}
    >
      {compact ? (
        <span className='sr-only'>{t('contentLanguage')}</span>
      ) : (
        <p
          className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'
        >
          {t('contentLanguage')}
        </p>
      )}

      <div
        role='group'
        aria-label={t('contentLanguage')}
        className={cn(
          'flex gap-0.5 rounded-none p-0.5',
          onBrand
            ? 'border border-foreground/15 bg-card/70'
            : 'border border-border bg-muted/40'
        )}
      >
        {(['en', 'am'] as const).map((code) => {
          const selected = value === code;
          return (
            <button
              key={code}
              type='button'
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => onChange(code)}
              className={cn(
                'rounded-none px-2.5 font-mono text-xs font-semibold uppercase tracking-[0.04em] transition-colors',
                compact ? 'h-8 min-w-[4.5rem] flex-none' : 'flex-1 py-1.5',
                selected
                  ? onBrand
                    ? 'bg-primary text-primary-foreground shadow-none'
                    : 'bg-primary text-primary-foreground shadow-none'
                  : onBrand
                    ? 'text-foreground/70 hover:bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] hover:text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                disabled && 'cursor-not-allowed opacity-50'
              )}
            >
              {localeLabels[code]}
            </button>
          );
        })}
      </div>

      {compact ? null : (
        <p
          className={cn(
            'text-[11px] leading-snug',
            'text-muted-foreground'
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
