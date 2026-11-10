import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * App chrome rules (landing page excluded):
 * - primary: page/hero headers — teal bg, white titles, gold accents
 * - soft: default panel / section headers — light green wash, foreground text
 * - brand: lead callouts only (chat rail headers, SurvaiBrandCard, CTAs)
 * - CTAs: brand fill → primary on hover; quiet actions stay outline/card
 */

export type SurvaiPanelHeaderTone = 'brand' | 'primary' | 'soft';

export const panelHeaderToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand:
    'border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand',
  primary:
    'border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary',
  soft: 'border-b border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft'
};

const panelTitleToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand: 'text-brand-foreground',
  primary: 'text-primary-foreground',
  soft: 'text-foreground'
};

const panelSubtitleToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand: 'text-brand-foreground/75',
  primary: 'text-[color-mix(in_srgb,var(--gold)_55%,white)]',
  soft: 'text-muted-foreground'
};

const panelIconToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand:
    'border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)]',
  primary:
    'border-[color-mix(in_srgb,var(--primary-foreground)_28%,transparent)] bg-primary-foreground/12 text-primary-foreground shadow-none',
  soft:
    'border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-white/70 text-primary shadow-none'
};

/** Meta chips on primary (teal) surfaces. */
export const primaryMetaChipClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--gold)_30%,transparent)] bg-[color-mix(in_srgb,var(--gold)_12%,transparent)] px-2 py-1 text-[11px] text-[var(--gold)]';

/** Meta chips on brand (green) surfaces. */
export const brandMetaChipClass =
  'inline-flex items-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2 py-1 text-[11px] text-[var(--primary)]';

/** Nested section index badge (primary fill). */
export const sectionIndexClass =
  'flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary font-mono text-[11px] font-bold tabular-nums text-primary-foreground shadow-sm';

/** Soft nested section header bar (non-SurvaiPanelHeader). */
export const softSectionHeaderClass =
  'border-b border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-4 py-3.5 sm:px-5';

/** Dialog / sheet headers. */
export const dialogHeaderPrimaryClass =
  'border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary px-5 py-4 text-primary-foreground';
export const dialogHeaderBrandClass =
  'border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-5 py-4 text-brand-foreground';
export const dialogHeaderSoftClass =
  'border-b border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-5 py-4 text-foreground';

/**
 * Shared Survai card chrome —
 * white card, soft border, 1.125rem radius, teal/green brand accents.
 */
export function SurvaiPanel({
  children,
  className,
  variant = 'default'
}: {
  children: ReactNode;
  className?: string;
  /** Soft tints the panel with brand-soft (lead / highlighted sections). */
  variant?: 'default' | 'soft';
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-[1.125rem] border border-border bg-card',
        'shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent),0_8px_24px_-16px_color-mix(in_srgb,var(--foreground)_18%,transparent)]',
        variant === 'soft' &&
          'border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft/35',
        className
      )}
    >
      {children}
    </div>
  );
}

export function SurvaiPanelHeader({
  icon,
  title,
  subtitle,
  badge,
  actions,
  tone = 'soft',
  className
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  /** soft = light default; primary = teal page hero; brand = full secondary green */
  tone?: SurvaiPanelHeaderTone;
  className?: string;
}) {
  return (
    <div className={cn(panelHeaderToneClass[tone], 'px-5 py-3.5', className)}>
      <div className='flex flex-wrap items-center gap-3'>
        {icon ? (
          <div
            data-slot='panel-icon'
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-xl',
              panelIconToneClass[tone]
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className='min-w-0 flex-1 basis-[12rem]'>
          {typeof title === 'string' ? (
            <h3
              className={cn(
                'font-display text-base font-bold tracking-tight sm:text-lg',
                panelTitleToneClass[tone]
              )}
            >
              {title}
            </h3>
          ) : (
            <div className={cn('min-w-0', panelTitleToneClass[tone])}>
              {title}
            </div>
          )}
          {subtitle ? (
            <p className={cn('text-sm leading-snug', panelSubtitleToneClass[tone])}>
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? <div className='shrink-0'>{badge}</div> : null}
        {actions ? (
          <div className='ml-auto flex shrink-0 flex-wrap items-center justify-end gap-2'>
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SurvaiPanelBody({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function SurvaiPanelFooter({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-t border-border bg-brand-soft/70 px-5 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Brand CTA card — sidebar Collect / Generate / continue CTAs. */
export function SurvaiBrandCard({
  title,
  description,
  children,
  className
}: {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[1.125rem]',
        'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))]',
        'bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_14%,transparent),0_12px_28px_-18px_color-mix(in_srgb,var(--foreground)_28%,transparent)]',
        className
      )}
    >
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.35]'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--foreground) 10%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 10%, transparent) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
          maskImage:
            'radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 90% 80% at 50% 0%, black 20%, transparent 75%)'
        }}
        aria-hidden
      />
      <div className='relative space-y-4 p-5'>
        <div className='space-y-1.5'>
          <div className='flex items-center gap-2'>
            <span
              className='size-1.5 shrink-0 animate-pulse rounded-full bg-brand-foreground/80'
              aria-hidden
            />
            <h3 className='font-display text-2xl font-extrabold tracking-tight text-brand-foreground'>
              {title}
            </h3>
          </div>
          {description ? (
            <p className='text-sm leading-relaxed text-brand-foreground/75'>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Primary brand CTA — secondary green fill, primary teal on hover. */
export const brandCtaClass =
  'h-9 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-3.5 text-sm font-semibold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[background-color,color,border-color,box-shadow] hover:border-primary hover:bg-primary hover:text-primary-foreground';

/** Compact toolbar / export row CTA. */
export const compactCtaClass =
  'h-8 gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand px-3 text-xs font-medium text-brand-foreground shadow-none transition-[background-color,color,border-color] hover:border-primary hover:bg-primary hover:text-primary-foreground';

/** Strong primary fill CTA (use sparingly — brand CTAs preferred). */
export const primaryCtaClass =
  'h-9 rounded-xl border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] transition-[filter] hover:brightness-110 disabled:opacity-60';

/** Secondary quiet action for non-primary buttons. */
export const quietActionClass =
  'h-8 gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-none transition-colors hover:bg-muted/60';

/** Soft brand wash action (regenerate / secondary tools). */
export const softActionClass =
  'h-8 gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-3 text-xs font-medium text-primary shadow-none transition-[background-color,color] hover:bg-primary hover:text-primary-foreground';
