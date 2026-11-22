import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * App chrome rules (landing page excluded) — ink / mint editorial v2:
 * - primary: ink headers, light titles
 * - soft: mint wash section headers
 * - brand: mint callouts (chat rail, lead sections)
 */

export type SurvaiPanelHeaderTone = 'brand' | 'primary' | 'soft';

/** Shared mint wash for section headers — brand + soft use the same surface. */
export const panelWashClass =
  'border-b border-foreground/15 bg-[color-mix(in_srgb,var(--brand)_72%,var(--background))]';

export const panelHeaderToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand: panelWashClass,
  primary: 'border-b border-foreground/20 bg-primary',
  soft: panelWashClass
};

const panelTitleToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand: 'text-foreground',
  primary: 'text-primary-foreground',
  soft: 'text-foreground'
};

const panelSubtitleToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand: 'text-muted-foreground',
  primary: 'text-primary-foreground/75',
  soft: 'text-muted-foreground'
};

const panelIconToneClass: Record<SurvaiPanelHeaderTone, string> = {
  brand:
    'border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card/80 text-foreground shadow-none',
  primary:
    'border-[color-mix(in_srgb,var(--primary-foreground)_28%,transparent)] bg-primary-foreground/12 text-primary-foreground shadow-none',
  soft:
    'border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card/80 text-foreground shadow-none'
};

/** Meta chips on primary (teal) surfaces. */
export const primaryMetaChipClass =
  'inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--primary-foreground)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary-foreground)_12%,transparent)] px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.05em] text-primary-foreground';

/** Meta chips on brand (green) surfaces — always brand-foreground. */
export const brandMetaChipClass =
  'inline-flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)] px-2.5 py-1.5 font-mono text-xs font-semibold uppercase tracking-[0.05em] text-brand-foreground';

/** Frosted controls (inputs/selects) sitting on brand header bars. */
export const onBrandControlClass =
  'border-[color-mix(in_srgb,var(--brand-foreground)_28%,transparent)] bg-background/80 text-brand-foreground placeholder:text-brand-foreground/50';

/** Nested section index badge (primary fill). */
export const sectionIndexClass =
  'flex size-8 shrink-0 items-center justify-center rounded-none border border-foreground/20 bg-primary font-mono text-xs font-bold tabular-nums text-primary-foreground';

/** Right-aligned question metadata chips (type, required, source). */
export const questionMetaBadgeRowClass =
  'flex w-full shrink-0 flex-wrap items-center gap-1.5 sm:max-w-[min(100%,24rem)] sm:justify-end';

/** Choice option preview chips under a question prompt. */
export const questionOptionChipClass =
  'inline-flex h-8 items-center gap-1.5 rounded-none border border-border bg-card px-2.5 text-xs font-medium text-foreground';

/** Soft nested section header bar (non-SurvaiPanelHeader). */
export const softSectionHeaderClass =
  `${panelWashClass} px-4 py-3.5 sm:px-5`;

/** Dialog / sheet headers. */
export const dialogHeaderPrimaryClass =
  'border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary px-5 py-4 text-primary-foreground';
export const dialogHeaderBrandClass =
  `${panelWashClass} px-5 py-4 text-foreground`;
export const dialogHeaderSoftClass =
  `${panelWashClass} px-5 py-4 text-foreground`;

/**
 * Shared Survai card chrome — hairline border, square corners, mint accents.
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
        'overflow-hidden rounded-none border border-border bg-card shadow-none',
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
              'flex size-8 shrink-0 items-center justify-center rounded-none border border-foreground/10',
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
                'font-display text-lg font-bold tracking-[-0.035em] sm:text-xl',
                panelTitleToneClass[tone]
              )}
            >
              {title}
            </h3>
          ) : (
            <div className={cn('min-w-0 font-semibold', panelTitleToneClass[tone])}>
              {title}
            </div>
          )}
          {subtitle ? (
            <p className={cn('text-sm font-medium leading-snug', panelSubtitleToneClass[tone])}>
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
  className,
  compact = false
}: {
  children: ReactNode;
  className?: string;
  /** Tighter padding for dense forms (plan editor, settings). */
  compact?: boolean;
}) {
  return <div className={cn(compact ? 'p-4' : 'p-5', className)}>{children}</div>;
}

/** Plan / settings field chrome — paper surface, not mint wash. */
export const planFieldLabelClass =
  'text-muted-foreground text-xs font-semibold tracking-wide uppercase';

export const planFieldControlClass =
  'rounded-none border border-border bg-background text-sm font-medium text-foreground shadow-none placeholder:text-muted-foreground/80 focus-visible:border-[color-mix(in_srgb,var(--foreground)_28%,var(--border))] focus-visible:ring-1 focus-visible:ring-ring/35';

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

/**
 * Mint rail card — sticky sidebar status / proceed CTAs (Review, Plan).
 * Ink hairline, full mint fill, square corners — no pills or soft shadows.
 */
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
        'relative isolate overflow-hidden rounded-none border border-foreground bg-brand shadow-none',
        className
      )}
    >
      <div
        className='pointer-events-none absolute inset-0 z-0 opacity-[0.22]'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--foreground) 12%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent, #000 16%, #000 84%, transparent)'
        }}
        aria-hidden
      />
      <div className='relative z-10 space-y-3 p-4'>
        <div>
          <h3 className='text-lg font-bold tracking-tight text-foreground sm:text-xl'>
            {title}
          </h3>
          {description ? (
            <p className='mt-1 text-sm leading-snug text-foreground/75'>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}

/** Paper row inside a mint rail card — hairline, square icon slot. */
export function SurvaiRailRow({
  icon,
  children,
  active = true,
  trailing,
  className
}: {
  icon: ReactNode;
  children: ReactNode;
  /** Filled ink icon vs quiet muted slot */
  active?: boolean;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <li
      className={cn(
        'flex items-center gap-2.5 border border-foreground/15 bg-background px-2.5 py-2',
        className
      )}
    >
      <span
        className={cn(
          'flex size-6 shrink-0 items-center justify-center border border-foreground/20',
          active
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {icon}
      </span>
      <span
        className={cn(
          'min-w-0 flex-1 text-sm',
          active ? 'font-medium text-foreground' : 'text-muted-foreground'
        )}
      >
        {children}
      </span>
      {trailing ? <span className='shrink-0'>{trailing}</span> : null}
    </li>
  );
}

/** Primary brand CTA — secondary green fill, primary teal on hover. */
export const brandCtaClass =
  'h-10 rounded-none border border-foreground/20 bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-none transition-[background-color,color,border-color] hover:border-primary hover:bg-primary hover:text-primary-foreground';

/** Compact toolbar / export row CTA. */
export const compactCtaClass =
  'h-9 gap-1.5 rounded-none border border-foreground/15 bg-brand px-3.5 text-sm font-semibold text-brand-foreground shadow-none transition-[background-color,color,border-color] hover:border-primary hover:bg-primary hover:text-primary-foreground';

/** Strong primary fill CTA (use sparingly — brand CTAs preferred). */
export const primaryCtaClass =
  'h-10 rounded-none border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-none transition-[background-color,color,border-color] hover:bg-brand hover:text-brand-foreground disabled:opacity-60';

/** Secondary quiet action for non-primary buttons. */
export const quietActionClass =
  'h-9 gap-1.5 rounded-none border border-border bg-card px-3.5 text-sm font-semibold text-foreground shadow-none transition-colors hover:bg-brand-soft/60';

/** Soft brand wash action (regenerate / secondary tools). */
export const softActionClass =
  'h-9 gap-1.5 rounded-none border border-foreground/15 bg-brand-soft px-3.5 text-sm font-semibold text-foreground shadow-none transition-[background-color,color] hover:bg-brand hover:text-brand-foreground';
