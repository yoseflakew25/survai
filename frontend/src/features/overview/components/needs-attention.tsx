'use client';

import { Icons } from '@/components/icons';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { overviewQueryOptions } from '@/features/overview/api/queries';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

function kindMeta(kind: string): {
  label: string;
  icon: typeof Icons.warning;
  className: string;
} {
  if (kind === 'stale_report') {
    return {
      label: 'Stale report',
      icon: Icons.warning,
      className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
    };
  }
  if (kind === 'ready_for_report') {
    return {
      label: 'Ready for report',
      icon: Icons.report,
      className: 'bg-primary text-primary-foreground'
    };
  }
  if (kind === 'no_responses') {
    return {
      label: 'Needs responses',
      icon: Icons.collect,
      className: 'bg-muted text-muted-foreground'
    };
  }
  if (kind === 'draft') {
    return {
      label: 'Draft',
      icon: Icons.review,
      className: 'bg-brand-soft text-primary'
    };
  }
  return {
    label: 'Plan ready',
    icon: Icons.plan,
    className: 'bg-brand-soft text-primary'
  };
}

export function NeedsAttention() {
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) {
    return (
      <SurvaiPanel className='flex h-full flex-col'>
        <SurvaiPanelHeader
          icon={<Icons.warning className='size-3.5' />}
          title='Needs attention'
          subtitle='Loading…'
        />
        <SurvaiPanelBody className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-16 rounded-xl' />
          ))}
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  if (isError || !data) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.warning className='size-3.5' />}
          title='Needs attention'
          subtitle='Could not load items'
        />
        <SurvaiPanelBody>
          <p className='text-sm text-destructive'>Refresh and try again.</p>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  const items = data.attention;

  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.warning className='size-3.5' />}
        title='Needs attention'
        subtitle={
          items.length === 0
            ? 'Nothing urgent — workspace looks healthy'
            : `${items.length} item${items.length === 1 ? '' : 's'} to review`
        }
        badge={
          items.length > 0 ? (
            <span className='rounded-full bg-primary px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-primary-foreground'>
              {items.length}
            </span>
          ) : null
        }
      />
      <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
        {items.length === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft/40 px-4 py-10 text-center'>
            <span className='mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
              <Icons.check className='size-5' strokeWidth={2.5} />
            </span>
            <p className='font-display text-sm font-bold tracking-tight text-foreground'>
              All clear
            </p>
            <p className='text-muted-foreground mt-1 max-w-[16rem] text-xs leading-relaxed'>
              No stale reports, empty live surveys, or unfinished drafts right
              now.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const meta = kindMeta(item.kind);
            const Icon = meta.icon;
            return (
              <Link
                key={item.id}
                href={item.href}
                className='group flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] hover:bg-brand-soft/50'
              >
                <span
                  className={cn(
                    'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl',
                    meta.className
                  )}
                >
                  <Icon className='size-3.5' />
                </span>
                <div className='min-w-0 flex-1'>
                  <div className='flex items-start justify-between gap-2'>
                    <p className='line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground'>
                      {item.title}
                    </p>
                    <span className='text-muted-foreground shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-[10px] font-semibold'>
                      {meta.label}
                    </span>
                  </div>
                  <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                    {item.detail}
                  </p>
                </div>
                <Icons.chevronRight className='text-muted-foreground mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
              </Link>
            );
          })
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
