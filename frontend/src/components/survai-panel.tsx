import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Shared Survai card chrome — Launchpot-derived:
 * warm paper / white card, soft border, 1.125rem radius, lime brand accents.
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
  className
}: {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: string;
  badge?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'border-b border-border bg-secondary/60 px-4 py-3',
        className
      )}
    >
      <div className='flex items-center gap-3'>
        {icon ? (
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-xl',
              'border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))]',
              'bg-brand-soft text-foreground',
              'shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)]'
            )}
          >
            {icon}
          </div>
        ) : null}
        <div className='min-w-0 flex-1'>
          {typeof title === 'string' ? (
            <h3 className='font-display text-lg font-bold tracking-tight text-foreground'>
              {title}
            </h3>
          ) : (
            <div className='min-w-0'>{title}</div>
          )}
          {subtitle ? (
            <p className='text-muted-foreground text-sm leading-snug'>
              {subtitle}
            </p>
          ) : null}
        </div>
        {badge ? <div className='shrink-0'>{badge}</div> : null}
        {actions ? <div className='ml-auto shrink-0'>{actions}</div> : null}
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
  return <div className={cn('p-4', className)}>{children}</div>;
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
        'border-t border-border bg-secondary/40 px-4 py-3',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Lime brand CTA card — sidebar Collect / Generate / continue CTAs. */
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
      {/* Dot-grid wash — Launchpot signature */}
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
            <h3 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground'>
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
