'use client';

import type { ReactNode } from 'react';

import { brandMetaChipClass } from '@/components/survai-panel';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type OperatorLevel = 'operational' | 'attention' | 'critical';
export type CheckState = 'pass' | 'warn' | 'fail' | 'neutral';

export type StatStripItem = {
  label: string;
  value: string;
  hint: string;
};

export type MetaChip = {
  label: string;
  value: string;
  warn?: boolean;
  valueClassName?: string;
};

export function formatAdminSyncTime(dataUpdatedAt: number) {
  if (dataUpdatedAt <= 0) return 'Not synced';
  const seconds = Math.round((Date.now() - dataUpdatedAt) / 1000);
  if (seconds < 15) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return new Date(dataUpdatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function operatorHeaderClass(level: OperatorLevel) {
  switch (level) {
    case 'critical':
      return 'border-b border-destructive/40 bg-[color-mix(in_srgb,var(--destructive)_22%,var(--brand))]';
    case 'attention':
      return 'border-b border-amber-500/35 bg-[color-mix(in_srgb,var(--gold)_18%,var(--brand))]';
    default:
      return 'border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand';
  }
}

export function checkBarClass(state: CheckState) {
  switch (state) {
    case 'pass':
      return 'bg-[color-mix(in_srgb,var(--brand)_85%,var(--foreground))]';
    case 'warn':
      return 'bg-amber-500';
    case 'fail':
      return 'bg-destructive';
    case 'neutral':
      return 'bg-muted-foreground/35';
  }
}

export function checkBadgeClass(state: CheckState) {
  switch (state) {
    case 'pass':
      return 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground';
    case 'warn':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200';
    case 'fail':
      return 'border-destructive/30 bg-destructive/10 text-destructive';
    case 'neutral':
      return 'border-border bg-muted/50 text-muted-foreground';
  }
}

export function OperatorMetaChips({
  chips,
  className
}: {
  chips: MetaChip[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            brandMetaChipClass,
            'gap-2 rounded-lg px-2.5 py-1.5',
            chip.warn && 'border-amber-400/40 bg-amber-400/15'
          )}
        >
          <span className='font-sans text-[9px] font-bold tracking-[0.08em] text-brand-foreground/60 uppercase'>
            {chip.label}
          </span>
          <span
            className={cn(
              'max-w-[8rem] truncate font-mono text-[11px] font-semibold text-brand-foreground',
              chip.valueClassName
            )}
          >
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  );
}

export function OperatorHero({
  kicker,
  headline,
  subtitle,
  level,
  chips,
  headerAction,
  statStrip,
  showPulse = true
}: {
  kicker: string;
  headline: string;
  subtitle: string;
  level: OperatorLevel;
  chips: MetaChip[];
  headerAction: ReactNode;
  statStrip: StatStripItem[];
  showPulse?: boolean;
}) {
  return (
    <div className='overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card'>
      <div className={cn('px-3 py-3 sm:px-5 sm:py-4', operatorHeaderClass(level))}>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
         
            <div className='min-w-0'>
             
              <h2 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground sm:text-xl xl:text-2xl'>
                {headline}
              </h2>
              <p className='mt-1 line-clamp-2 text-sm text-brand-foreground/80 md:max-w-xl xl:max-w-2xl'>
                {subtitle}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 md:shrink-0'>
            <OperatorMetaChips chips={chips} />
            {headerAction}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--brand)_25%,var(--border))] lg:grid-cols-4'>
        {statStrip.map((stat) => (
          <div key={stat.label} className='bg-card px-4 py-3.5 sm:px-5'>
            <p className='text-[11px] font-medium text-muted-foreground'>{stat.label}</p>
            <p className='font-display text-2xl font-extrabold tracking-tight text-primary tabular-nums'>
              {stat.value}
            </p>
            <p className='mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
              {stat.hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OperatorInsightCard({
  label,
  detail,
  badge,
  count,
  max,
  state,
  icon
}: {
  label: string;
  detail: string;
  badge: string;
  count: number;
  max: number;
  state: CheckState;
  icon: ReactNode;
}) {
  const fill = Math.round((count / Math.max(1, max)) * 100);

  return (
    <article className='flex h-full flex-col rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex size-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card text-primary shadow-sm'>
          {icon}
        </div>
        <Badge
          variant='outline'
          className={cn(
            'rounded-full text-[10px] font-semibold tabular-nums',
            checkBadgeClass(state)
          )}
        >
          {badge}
        </Badge>
      </div>
      <h3 className='mt-3 text-sm font-semibold tracking-tight text-foreground'>{label}</h3>
      <p className='mt-1 flex-1 text-xs leading-relaxed text-muted-foreground'>{detail}</p>
      <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_80%,var(--card))]'>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', checkBarClass(state))}
          style={{ width: `${fill}%` }}
        />
      </div>
    </article>
  );
}

export function FilterTabList<T extends string>({
  ariaLabel,
  items,
  value,
  onChange,
  className
}: {
  ariaLabel: string;
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1',
        className
      )}
      role='tablist'
      aria-label={ariaLabel}
    >
      {items.map((tab) => (
        <button
          key={tab.id}
          type='button'
          role='tab'
          aria-selected={value === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors',
            value === tab.id
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function OperatorPageSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-52 w-full rounded-[1.125rem]' />
      <div className='grid gap-3 sm:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-40 rounded-[1.125rem]' />
        ))}
      </div>
      <Skeleton className='h-96 w-full rounded-[1.125rem]' />
    </div>
  );
}

export const brandToolbarButtonClass =
  'h-9 min-h-9 rounded-xl border border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card text-primary hover:bg-[color-mix(in_srgb,var(--card)_88%,white)]';
