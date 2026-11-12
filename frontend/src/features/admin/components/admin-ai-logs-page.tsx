'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useMemo, type ReactNode } from 'react';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import {
  brandMetaChipClass,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import {
  adminAiLogsQueryOptions,
  adminOverviewQueryOptions
} from '@/features/admin/api/queries';
import type {
  AdminAiLogItem,
  AdminOverview,
  AdminOverviewBreakdownItem
} from '@/features/admin/api/types';
import { createAdminAiLogColumns } from '@/features/admin/components/ai-logs/columns';
import {
  ADMIN_FEATURE_FLAG_GROUPS,
  ADMIN_FEATURE_FLAG_LABELS
} from '@/features/admin/components/orgs/feature-flags';
import { relativeTime } from '@/features/admin/components/overview/format';
import { useDataTable } from '@/hooks/use-data-table';
import { cn } from '@/lib/utils';

const AI_FEATURES = ADMIN_FEATURE_FLAG_GROUPS[0].keys;

type FeatureFilter = 'all' | (typeof AI_FEATURES)[number];
type StatusFilter = 'all' | 'success' | 'error';

type AiLevel = 'operational' | 'attention' | 'critical';
type CheckState = 'pass' | 'warn' | 'fail' | 'neutral';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'success', label: 'Success' },
  { id: 'error', label: 'Errors' }
];

function formatSyncTime(dataUpdatedAt: number) {
  if (dataUpdatedAt <= 0) return 'Not synced';
  const seconds = Math.round((Date.now() - dataUpdatedAt) / 1000);
  if (seconds < 15) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return new Date(dataUpdatedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function aiLevel(errorRate: number, volume: number): AiLevel {
  if (volume >= 5 && errorRate >= 0.15) return 'critical';
  if (volume >= 3 && errorRate >= 0.05) return 'attention';
  return 'operational';
}

function levelHeadline(level: AiLevel) {
  switch (level) {
    case 'operational':
      return 'AI generation healthy';
    case 'attention':
      return 'Elevated error rate';
    case 'critical':
      return 'Reliability needs attention';
  }
}

function levelSubtitle(
  level: AiLevel,
  featureFilter: FeatureFilter,
  statusFilter: StatusFilter
) {
  const filterBits = [
    featureFilter !== 'all'
      ? ADMIN_FEATURE_FLAG_LABELS[featureFilter] ?? featureFilter
      : null,
    statusFilter !== 'all' ? `${statusFilter} only` : null
  ].filter(Boolean);

  const filterNote =
    filterBits.length > 0 ? ` Viewing ${filterBits.join(' · ')}.` : '';

  switch (level) {
    case 'operational':
      return `Logged calls look stable across planner, builder, reviewer, reports, and assistant.${filterNote}`;
    case 'attention':
      return `Some generations are failing — inspect errors and model routing below.${filterNote}`;
    case 'critical':
      return `Failure rate is high enough to affect user-facing AI surfaces.${filterNote}`;
  }
}

function checkBarClass(state: CheckState) {
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

function badgeClass(state: CheckState) {
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

function avgLatencyMs(items: AdminAiLogItem[]) {
  const vals = items
    .map((i) => i.latency_ms)
    .filter((v): v is number => v != null);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toLocaleString();
}

function AiHeroMetaChips({
  featureFilter,
  statusFilter,
  errorRatePct,
  syncedAt,
  className
}: {
  featureFilter: FeatureFilter;
  statusFilter: StatusFilter;
  errorRatePct: string;
  syncedAt: string;
  className?: string;
}) {
  const errorNum = errorRatePct === '—' ? 0 : parseFloat(errorRatePct);
  const chips = [
    { label: 'Synced', value: syncedAt },
    {
      label: 'Surface',
      value:
        featureFilter === 'all'
          ? 'All'
          : (ADMIN_FEATURE_FLAG_LABELS[featureFilter] ?? featureFilter)
    },
    {
      label: 'Status',
      value: statusFilter === 'all' ? 'Any' : statusFilter,
      className: 'capitalize'
    },
    {
      label: 'Errors',
      value: errorRatePct === '—' ? '—' : `${errorRatePct}%`,
      warn: errorNum >= 5
    }
  ] as const;

  return (
    <div className={cn('flex flex-wrap items-center justify-end gap-2', className)}>
      {chips.map((chip) => (
        <span
          key={chip.label}
          className={cn(
            brandMetaChipClass,
            'gap-2 rounded-lg px-2.5 py-1.5',
            'warn' in chip && chip.warn && 'border-amber-400/40 bg-amber-400/15'
          )}
        >
          <span className='font-sans text-[9px] font-bold tracking-[0.08em] text-brand-foreground/60 uppercase'>
            {chip.label}
          </span>
          <span
            className={cn(
              'max-w-[8rem] truncate font-mono text-[11px] font-semibold tabular-nums text-brand-foreground',
              'className' in chip ? chip.className : undefined
            )}
          >
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function AiUsageHero({
  level,
  featureFilter,
  statusFilter,
  errorRatePct,
  syncedAt,
  statStrip,
  headerAction
}: {
  level: AiLevel;
  featureFilter: FeatureFilter;
  statusFilter: StatusFilter;
  errorRatePct: string;
  syncedAt: string;
  statStrip: { label: string; value: string; hint: string }[];
  headerAction: ReactNode;
}) {
  const headerClass =
    level === 'critical'
      ? 'border-b border-destructive/40 bg-[color-mix(in_srgb,var(--destructive)_22%,var(--brand))]'
      : level === 'attention'
        ? 'border-b border-amber-500/35 bg-[color-mix(in_srgb,var(--gold)_18%,var(--brand))]'
        : 'border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand';

  return (
    <div className='overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card'>
      <div className={cn('px-3 py-3 sm:px-5 sm:py-4', headerClass)}>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            
            <div className='min-w-0'>
             
              <h2 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground sm:text-xl xl:text-2xl'>
                {levelHeadline(level)}
              </h2>
              <p className='line-clamp-2 text-sm text-brand-foreground/80 md:max-w-xl xl:max-w-2xl'>
                {levelSubtitle(level, featureFilter, statusFilter)}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 md:shrink-0'>
            <AiHeroMetaChips
              featureFilter={featureFilter}
              statusFilter={statusFilter}
              errorRatePct={errorRatePct}
              syncedAt={syncedAt}
            />
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

function SurfaceInsightCard({
  item,
  max,
  icon
}: {
  item: AdminOverviewBreakdownItem;
  max: number;
  icon: ReactNode;
}) {
  const fill = Math.round((item.count / Math.max(1, max)) * 100);
  const state: CheckState =
    item.count === 0 ? 'neutral' : fill >= 40 ? 'pass' : 'warn';

  return (
    <article className='flex h-full flex-col rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex size-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card text-primary shadow-sm'>
          {icon}
        </div>
        <Badge
          variant='outline'
          className={cn('rounded-full text-[10px] font-semibold tabular-nums', badgeClass(state))}
        >
          {item.count.toLocaleString()} · 7d
        </Badge>
      </div>
      <h3 className='mt-3 text-sm font-semibold tracking-tight text-foreground'>
        {item.label}
      </h3>
      <p className='mt-1 flex-1 font-mono text-[10px] text-muted-foreground'>
        {item.key}
      </p>
      <div className='mt-4 h-1.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--border)_80%,var(--card))]'>
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', checkBarClass(state))}
          style={{ width: `${fill}%` }}
        />
      </div>
    </article>
  );
}

function surfaceIcon(key: string) {
  if (key.includes('planner')) return <Icons.plan className='size-4' />;
  if (key.includes('builder')) return <Icons.forms className='size-4' />;
  if (key.includes('reviewer')) return <Icons.review className='size-4' />;
  if (key.includes('report')) return <Icons.report className='size-4' />;
  if (key.includes('assistant')) return <Icons.chat className='size-4' />;
  return <Icons.sparkles className='size-4' />;
}

type Advisory = {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
};

function buildAdvisories(
  errorRate: number,
  volume: number,
  overview: AdminOverview | undefined
): Advisory[] {
  const list: Advisory[] = [];
  if (volume >= 5 && errorRate >= 0.15) {
    list.push({
      id: 'ai-error-high',
      severity: 'warning',
      title: `AI error rate ${(errorRate * 100).toFixed(0)}%`,
      detail: `${Math.round(volume * errorRate)} or more failures in the current scope. Triage model keys, timeouts, and schema validation errors.`
    });
  } else if (volume >= 3 && errorRate >= 0.05) {
    list.push({
      id: 'ai-error-elevated',
      severity: 'info',
      title: 'Elevated AI failures',
      detail:
        'Error share is above 5%. Filter to Errors below and compare features side by side.'
    });
  }
  if (overview?.recent_ai_failures.length) {
    list.push({
      id: 'recent-failures',
      severity: 'info',
      title: `${overview.recent_ai_failures.length} recent failure${overview.recent_ai_failures.length === 1 ? '' : 's'}`,
      detail:
        'Listed in the panel beside this message — same feed as Platform overview.'
    });
  }
  if (list.length === 0) {
    list.push({
      id: 'all-clear',
      severity: 'info',
      title: 'No reliability advisories',
      detail:
        'Generation logs look quiet. Re-sync after incidents or when onboarding new models.'
    });
  }
  return list;
}

function FilterTabs<T extends string>({
  label,
  items,
  value,
  onChange
}: {
  label: string;
  items: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
  return (
    <div
      className='flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1'
      role='tablist'
      aria-label={label}
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

function AiLogsSkeleton() {
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

export default function AdminAiLogsPage() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(25),
    feature: parseAsString.withDefault('all'),
    status: parseAsString.withDefault('all')
  });

  const featureFilter = (
    params.feature === 'all' || AI_FEATURES.includes(params.feature as never)
      ? params.feature
      : 'all'
  ) as FeatureFilter;

  const statusFilter = (
    STATUS_TABS.some((t) => t.id === params.status) ? params.status : 'all'
  ) as StatusFilter;

  const isFiltered = featureFilter !== 'all' || statusFilter !== 'all';

  const skip = (params.page - 1) * params.perPage;
  const listQuery = useMemo(
    () => ({
      feature: featureFilter === 'all' ? undefined : featureFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      skip,
      limit: params.perPage
    }),
    [featureFilter, params.perPage, statusFilter, skip]
  );

  const overviewQuery = useQuery({
    ...adminOverviewQueryOptions(),
    staleTime: 60_000
  });

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery(
    adminAiLogsQueryOptions(listQuery)
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / params.perPage)) : 1;

  const columns = useMemo(() => createAdminAiLogColumns(), []);

  const { table } = useDataTable({
    data: data?.items ?? [],
    columns,
    pageCount,
    shallow: true,
    initialState: { pagination: { pageIndex: 0, pageSize: params.perPage } }
  });

  const setFeature = useCallback(
    (next: FeatureFilter) => {
      void setParams({
        feature: next === 'all' ? null : next,
        page: 1
      });
    },
    [setParams]
  );

  const setStatus = useCallback(
    (next: StatusFilter) => {
      void setParams({
        status: next === 'all' ? null : next,
        page: 1
      });
    },
    [setParams]
  );

  const overview = overviewQuery.data;
  const errorRate = data?.error_rate ?? overview?.ai_error_rate_7d ?? 0;
  const volume = data?.total ?? overview?.ai_calls_7d ?? 0;
  const level = aiLevel(errorRate, volume);
  const errorRatePct =
    volume > 0 || data
      ? (errorRate * 100).toFixed(1)
      : '—';

  const pageLatency = avgLatencyMs(data?.items ?? []);
  const statStrip = [
    {
      label: 'Volume',
      value: (data?.total ?? overview?.ai_calls_7d)?.toLocaleString() ?? '—',
      hint: isFiltered ? 'Filtered rows' : 'Calls · 7d platform'
    },
    {
      label: 'Error rate',
      value: errorRatePct === '—' ? '—' : `${errorRatePct}%`,
      hint: isFiltered ? 'Current filter' : '7d platform share'
    },
    {
      label: 'Tokens',
      value: !isFiltered && overview ? fmtTokens(overview.ai_tokens_7d) : '—',
      hint: !isFiltered ? 'Input + output · 7d' : 'Unfilter to see 7d'
    },
    {
      label: 'Latency',
      value:
        !isFiltered && overview?.ai_avg_latency_ms_7d != null
          ? `${Math.round(overview.ai_avg_latency_ms_7d)}ms`
          : pageLatency != null
            ? `${pageLatency}ms`
            : '—',
      hint: !isFiltered && overview?.ai_avg_latency_ms_7d != null ? 'Avg · 7d' : 'Avg · this page'
    }
  ];

  const breakdown = overview?.ai_by_feature_7d ?? [];
  const breakdownMax = Math.max(1, ...breakdown.map((i) => i.count));

  const featureTabs: { id: FeatureFilter; label: string }[] = [
    { id: 'all', label: 'All features' },
    ...AI_FEATURES.map((key) => ({
      id: key,
      label: ADMIN_FEATURE_FLAG_LABELS[key] ?? key
    }))
  ];

  const refreshButton = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        void refetch();
        void overviewQuery.refetch();
      }}
      disabled={isFetching || overviewQuery.isFetching}
      className='h-9 rounded-xl border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card text-primary hover:bg-[color-mix(in_srgb,var(--card)_88%,white)]'
    >
      <Icons.spinner
        className={cn(
          'mr-1.5 size-3.5',
          (isFetching || overviewQuery.isFetching) && 'animate-spin'
        )}
      />
      {isFetching || overviewQuery.isFetching ? 'Syncing…' : 'Sync logs'}
    </Button>
  );

  const syncedAt = formatSyncTime(dataUpdatedAt);
  const showSkeleton = isLoading && !data && overviewQuery.isLoading;

  return (
    <PageContainer
      pageTitle='AI usage'
      pageDescription='Generation reliability, per-surface volume, and paginated call logs for operators.'
    >
      <div className='space-y-6'>
        {error ? (
          <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load AI logs'}
          </div>
        ) : null}

        {showSkeleton ? (
          <AiLogsSkeleton />
        ) : (
          <>
            <AiUsageHero
              level={level}
              featureFilter={featureFilter}
              statusFilter={statusFilter}
              errorRatePct={errorRatePct}
              syncedAt={syncedAt}
              statStrip={statStrip}
              headerAction={refreshButton}
            />

            <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <section className='space-y-3'>
                <div>
                  <h2 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                    By surface (7d)
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    Relative call volume per AI feature — from platform overview aggregates.
                  </p>
                </div>
                {breakdown.length === 0 ? (
                  <div className='rounded-[1.125rem] border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground'>
                    No AI calls in the last 7 days yet.
                  </div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {breakdown.map((item) => (
                      <SurfaceInsightCard
                        key={item.key}
                        item={item}
                        max={breakdownMax}
                        icon={surfaceIcon(item.key)}
                      />
                    ))}
                  </div>
                )}
              </section>

              <SurvaiPanel className='flex h-full flex-col'>
                <SurvaiPanelHeader
                  tone='soft'
                  icon={<Icons.warning className='size-3.5' />}
                  title='Operator advisories'
                  subtitle='Aligned with overview AI alerts'
                />
                <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
                  {buildAdvisories(errorRate, volume, overview).map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'rounded-xl border px-3.5 py-3',
                        item.severity === 'warning'
                          ? 'border-amber-500/35 bg-amber-500/[0.07]'
                          : 'border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-card/80'
                      )}
                    >
                      <div className='flex items-start gap-2'>
                        {item.severity === 'warning' ? (
                          <Icons.warning className='mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400' />
                        ) : (
                          <Icons.info className='mt-0.5 size-4 shrink-0 text-muted-foreground' />
                        )}
                        <div>
                          <p className='text-sm font-semibold text-foreground'>
                            {item.title}
                          </p>
                          <p className='mt-0.5 text-xs leading-relaxed text-muted-foreground'>
                            {item.detail}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  {overview?.recent_ai_failures.length ? (
                    <div className='mt-1 border-t border-border pt-3'>
                      <p className='mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                        Latest failures
                      </p>
                      <div className='scrollbar-thin max-h-48 space-y-1.5 overflow-y-auto pr-0.5'>
                        {overview.recent_ai_failures.slice(0, 5).map((row) => (
                          <div
                            key={row.id}
                            className='rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2'
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <p className='text-xs font-semibold text-foreground'>
                                {ADMIN_FEATURE_FLAG_LABELS[row.feature] ?? row.feature}
                              </p>
                              <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>
                                {relativeTime(row.created_at)}
                              </span>
                            </div>
                            <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
                              {row.user_email ?? 'unknown'} · {row.model}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </SurvaiPanelBody>
                <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                  <span className='font-mono text-[10px] uppercase tracking-wide'>
                    GET /admin/ai-logs
                  </span>
                  <Link
                    href='/admin/overview'
                    className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
                  >
                    Platform overview
                    <Icons.chevronRight className='size-3' />
                  </Link>
                </SurvaiPanelFooter>
              </SurvaiPanel>
            </div>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.sparkles className='size-3.5' />}
                title='Generation log'
                subtitle='Filter by surface and outcome, then inspect rows'
              />
              <SurvaiPanelBody className='space-y-4'>
                <div className='flex flex-col gap-3'>
                  <FilterTabs
                    label='AI feature'
                    items={featureTabs}
                    value={featureFilter}
                    onChange={setFeature}
                  />
                  <FilterTabs
                    label='Call status'
                    items={STATUS_TABS}
                    value={statusFilter}
                    onChange={setStatus}
                  />
                </div>

                {isLoading ? (
                  <DataTableSkeleton columnCount={8} rowCount={10} withViewOptions={false} />
                ) : (
                  <DataTable
                    table={table}
                    rowNoun='calls'
                    emptyTitle='No AI calls logged'
                    emptyDescription='Adjust filters or wait for teams to use AI surfaces.'
                    emptyIcon={<Icons.sparkles className='size-5 text-foreground' />}
                  />
                )}

                {data ? (
                  <p className='text-center font-mono text-[11px] text-muted-foreground'>
                    Showing {data.items.length.toLocaleString()} of{' '}
                    {data.total.toLocaleString()}
                    {featureFilter !== 'all'
                      ? ` · ${ADMIN_FEATURE_FLAG_LABELS[featureFilter] ?? featureFilter}`
                      : ''}
                    {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
                  </p>
                ) : null}
              </SurvaiPanelBody>
            </SurvaiPanel>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.code className='size-3.5' />}
                title='What we record'
                subtitle='Metadata only — no raw prompts or PII payloads'
              />
              <SurvaiPanelBody>
                <div className='grid gap-4 md:grid-cols-3'>
                  {(
                    [
                      {
                        title: 'Features',
                        body: 'Each call tags planner, builder, reviewer, reports, or assistant so you can filter failures by product surface.'
                      },
                      {
                        title: 'Outcomes',
                        body: 'Success, provider errors, and schema validation failures land in status with optional error_message for triage.'
                      },
                      {
                        title: 'Shape',
                        body: 'Model, latency, token counts, and user email help compare regressions without opening tenant survey content.'
                      }
                    ] as const
                  ).map((col) => (
                    <div
                      key={col.title}
                      className='rounded-xl border border-border bg-muted/20 px-4 py-3'
                    >
                      <p className='text-sm font-semibold text-foreground'>{col.title}</p>
                      <p className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                        {col.body}
                      </p>
                    </div>
                  ))}
                </div>
              </SurvaiPanelBody>
            </SurvaiPanel>
          </>
        )}
      </div>
    </PageContainer>
  );
}
