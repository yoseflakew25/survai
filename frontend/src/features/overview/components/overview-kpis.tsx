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

function KpiCard({ kpi }: { kpi: OverviewKpi }) {
  return (
    <article
      className={cn(
        'group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card p-4 transition-colors duration-200',
        'hover:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] hover:bg-brand-soft/50'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-[12px] font-medium text-muted-foreground'>{kpi.label}</p>
          <p className='font-display mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-foreground'>
            {kpi.value}
          </p>
          <p className='mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
            {kpi.hint}
          </p>
        </div>
        <Badge
          variant='secondary'
          className='shrink-0 rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-foreground'
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
    <div className='rounded-2xl border border-border bg-card p-4'>
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
      <div className='rounded-2xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
        Could not load workspace stats. Refresh and try again.
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
      {data.kpis.map((kpi) => (
        <KpiCard key={kpi.label} kpi={kpi} />
      ))}
    </div>
  );
}
