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
          className={cn(
            'text-[10px] font-semibold tracking-wide uppercase',
            onBrand ? 'text-brand-foreground/70' : 'text-muted-foreground'
          )}
        >
          {t('contentLanguage')}
        </p>
      )}

      <div
        role='group'
        aria-label={t('contentLanguage')}
        className={cn(
          'flex gap-1 rounded-xl p-1',
          onBrand
            ? 'border border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)]'
            : 'bg-muted/40'
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
                'rounded-lg px-2.5 text-xs font-semibold transition-colors',
                compact ? 'h-8 min-w-[4.5rem] flex-none' : 'flex-1 py-1.5',
                selected
                  ? onBrand
                    ? 'bg-brand-foreground text-brand shadow-sm'
                    : 'bg-card text-foreground shadow-sm'
                  : onBrand
                    ? 'text-brand-foreground/70 hover:bg-[color-mix(in_srgb,var(--brand-foreground)_12%,transparent)] hover:text-brand-foreground'
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
            onBrand ? 'text-brand-foreground/65' : 'text-muted-foreground'
          )}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
