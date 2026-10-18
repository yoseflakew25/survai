import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Shared Survai card chrome for survey module sections. */
export function SurvaiPanel({
  children,
  className
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-border bg-card shadow-sm',
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
  className
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('border-b border-border bg-muted/30 px-4 py-3', className)}>
      <div className='flex items-center gap-3'>
        {icon ? (
          <div className='flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
            {icon}
          </div>
        ) : null}
        <div className='min-w-0'>
          <h3 className='font-display text-sm font-bold tracking-tight text-foreground'>
            {title}
          </h3>
          {subtitle ? (
            <p className='text-muted-foreground text-xs'>{subtitle}</p>
          ) : null}
        </div>
        {badge ? <div className='ml-auto shrink-0'>{badge}</div> : null}
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
    <div className={cn('border-t border-border px-4 py-3', className)}>
      {children}
    </div>
  );
}

/** Lime brand CTA card used in sidebars (Generate Report, View Results, etc.). */
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
        'relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-sm',
        className
      )}
    >
      <div
        className='pointer-events-none absolute inset-0 opacity-40'
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
          backgroundSize: '20px 20px',
          maskImage:
            'linear-gradient(to right, transparent, black 25%, black 75%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 25%, black 75%, transparent)'
        }}
      />
      <div className='relative space-y-4 p-5'>
        <div>
          <h3 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground'>
            {title}
          </h3>
          {description ? (
            <p className='mt-1 text-sm leading-relaxed text-brand-foreground/80'>
              {description}
            </p>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  );
}
