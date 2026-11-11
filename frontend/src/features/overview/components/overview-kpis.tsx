'use client';

import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { overviewQueryOptions } from '@/features/overview/api/queries';
import type { OverviewKpi } from '@/features/overview/api/types';

function TrendIcon({ trend }: { trend: OverviewKpi['trend'] }) {
  if (trend === 'down') return <Icons.trendingDown className='size-3' />;
  if (trend === 'flat') return <Icons.minus className='size-3' />;
  return <Icons.trendingUp className='size-3' />;
}

function WelcomeCard() {
  return (
    <article
      className={cn(
        'flex flex-col justify-center rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand p-4',
        'shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)]'
      )}
    >
      <h1 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-foreground'>
        Welcome to Survai
      </h1>
      <p className='text-sm leading-relaxed text-brand-foreground/75'>
        Live counts from your surveys and responses.
      </p>
    </article>
  );
}

function KpiCard({ kpi }: { kpi: OverviewKpi }) {
  return (
    <article
      className={cn(
        'rounded-[1.125rem] border border-border bg-card p-4 transition-colors duration-200',
        'hover:bg-muted/30'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-[12px] font-medium text-muted-foreground'>
            {kpi.label}
          </p>
          <p className='font-display text-3xl font-extrabold tracking-tight tabular-nums text-primary'>
            {kpi.value}
          </p>
          <p className='font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
            {kpi.hint}
          </p>
        </div>
        <Badge
          variant='secondary'
          className='shrink-0 rounded-full border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground'
        >
          <TrendIcon trend={kpi.trend} />
          {kpi.delta}
        </Badge>
      </div>
    </article>
  );
}

function KpiSkeleton() {
  return (
    <div className='rounded-[1.125rem] border border-border bg-card p-4'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='mt-3 h-8 w-20' />
      <Skeleton className='mt-2 h-3 w-28' />
    </div>
  );
}

export function OverviewKpis() {
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) {
    return (
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
        Could not load workspace stats. Refresh and try again.
      </div>
    );
  }

  const kpis = data.kpis.filter((kpi) => kpi.label !== 'Completion Rate');

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
      <WelcomeCard />
      {kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
