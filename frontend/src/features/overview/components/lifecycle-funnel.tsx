'use client';

import { Icons } from '@/components/icons';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Skeleton } from '@/components/ui/skeleton';
import { overviewQueryOptions } from '@/features/overview/api/queries';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';

const STAGE_HREF: Record<string, string> = {
  plan: '/dashboard/plans',
  review: '/dashboard/surveys',
  collect: '/dashboard/surveys',
  analytics: '/dashboard/surveys',
  report: '/dashboard/surveys'
};

function stageIcon(key: string) {
  if (key === 'plan') return Icons.plan;
  if (key === 'review') return Icons.review;
  if (key === 'collect') return Icons.collect;
  if (key === 'analytics') return Icons.analytics;
  return Icons.report;
}

export function LifecycleFunnel() {
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) {
    return (
      <SurvaiPanel className='flex h-full flex-col'>
        <SurvaiPanelHeader
          // icon={<Icons.forms className='size-3.5' />}
          title='Lifecycle'
          subtitle='Loading pipeline…'
        />
        <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className='h-12 rounded-xl' />
          ))}
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  if (isError || !data) {
    return (
      <SurvaiPanel className='flex h-full flex-col'>
        <SurvaiPanelHeader
          // icon={<Icons.forms className='size-3.5' />}
          title='Lifecycle'
          subtitle='Could not load pipeline'
        />
        <SurvaiPanelBody>
          <p className='text-sm text-destructive'>Refresh and try again.</p>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  const stages = data.lifecycle;
  const maxCount = Math.max(1, ...stages.map((s) => s.count));
  const total = stages.reduce((sum, s) => sum + s.count, 0);

  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader
        // icon={<Icons.forms className='size-3.5' />}
        title='Lifecycle'
        subtitle={
          total === 0
            ? 'No workspace activity yet'
            : 'Plan → Report at a glance'
        }
      />
      <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
        {stages.map((stage, index) => {
          const Icon = stageIcon(stage.key);
          const fill = Math.round((stage.count / maxCount) * 100);
          const href = STAGE_HREF[stage.key] ?? '/dashboard/surveys';
          return (
            <Link
              key={stage.key}
              href={href}
              className='group relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] hover:bg-brand-soft/40'
            >
              <div
                className='pointer-events-none absolute inset-y-0 left-0 bg-brand/20 transition-all'
                style={{ width: `${fill}%` }}
                aria-hidden
              />
              <span className='relative flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand text-brand-foreground'>
                <Icon className='size-3.5' />
              </span>
              <div className='relative min-w-0 flex-1'>
                <p className='text-sm font-semibold tracking-tight text-foreground'>
                  {stage.label}
                </p>
                <p className='text-muted-foreground text-[11px]'>
                  Stage {index + 1} of {stages.length}
                </p>
              </div>
              <p className='relative font-display text-xl font-extrabold tabular-nums tracking-tight text-foreground'>
                {stage.count.toLocaleString()}
              </p>
              {index < stages.length - 1 ? (
                <Icons.chevronRight className='text-muted-foreground relative size-4 shrink-0 opacity-50' />
              ) : (
                <span className='relative size-4 shrink-0' aria-hidden />
              )}
            </Link>
          );
        })}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
