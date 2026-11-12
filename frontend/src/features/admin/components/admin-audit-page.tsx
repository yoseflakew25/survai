'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useMemo, useState, type ReactNode } from 'react';

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
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import {
  adminAuditQueryOptions,
  adminOverviewQueryOptions
} from '@/features/admin/api/queries';
import type { AdminAuditItem, AdminOverview } from '@/features/admin/api/types';
import { createAdminAuditColumns } from '@/features/admin/components/audit/columns';
import { formatAction, relativeTime } from '@/features/admin/components/overview/format';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { cn } from '@/lib/utils';

type AuditLevel = 'operational' | 'attention';
type CheckState = 'pass' | 'warn' | 'fail' | 'neutral';

type ActionCategory = 'all' | 'org' | 'user' | 'impersonation';

const CATEGORY_TABS: { id: ActionCategory; label: string; filter?: string }[] = [
  { id: 'all', label: 'All events' },
  { id: 'org', label: 'Organizations', filter: 'org.' },
  { id: 'user', label: 'Users', filter: 'user.' },
  { id: 'impersonation', label: 'Impersonation', filter: 'impersonation.' }
];

const ACTION_INSIGHTS = [
  {
    key: 'org',
    label: 'Workspace changes',
    detail: 'Suspend, reactivate, and feature-flag updates',
    prefix: 'org.',
    icon: <Icons.workspace className='size-4' />
  },
  {
    key: 'user',
    label: 'User provisioning',
    detail: 'Creates and seat / activation changes',
    prefix: 'user.',
    icon: <Icons.user className='size-4' />
  },
  {
    key: 'impersonation',
    label: 'Support access',
    detail: 'Impersonation start and stop events',
    prefix: 'impersonation.',
    icon: <Icons.eye className='size-4' />
  },
  {
    key: 'other',
    label: 'Other mutations',
    detail: 'Anything outside the standard admin verbs',
    prefix: null,
    icon: <Icons.settings className='size-4' />
  }
] as const;

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

function isSensitiveAction(action: string) {
  return (
    action.includes('suspend') ||
    action.startsWith('impersonation.') ||
    action.includes('feature_flags')
  );
}

function auditLevel(filtered: boolean, recent: AdminAuditItem[]): AuditLevel {
  if (filtered) return 'attention';
  if (recent.some((row) => isSensitiveAction(row.action))) return 'attention';
  return 'operational';
}

function levelHeadline(level: AuditLevel, filtered: boolean) {
  if (filtered) return 'Filtered audit view';
  switch (level) {
    case 'operational':
      return 'Activity trail active';
    case 'attention':
      return 'Sensitive actions logged';
  }
}

function levelSubtitle(level: AuditLevel, filtered: boolean) {
  if (filtered) {
    return 'Narrowing by action key or organization ID — clear filters to see the full platform timeline.';
  }
  switch (level) {
    case 'operational':
      return 'Admin mutations and support actions are appended immutably for compliance and incident review.';
    case 'attention':
      return 'Recent suspends, impersonation, or flag changes need operator awareness — see highlights beside the log.';
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

function countForInsight(
  items: AdminAuditItem[],
  prefix: string | null
) {
  if (prefix === null) {
    const known = new Set(
      ACTION_INSIGHTS.filter((i) => i.prefix).map((i) => i.prefix as string)
    );
    return items.filter(
      (row) => ![...known].some((p) => row.action.startsWith(p))
    ).length;
  }
  return items.filter((row) => row.action.startsWith(prefix)).length;
}

function AuditHeroMetaChips({
  syncedAt,
  actionLabel,
  orgLabel,
  category,
  className
}: {
  syncedAt: string;
  actionLabel: string;
  orgLabel: string;
  category: ActionCategory;
  className?: string;
}) {
  const categoryLabel =
    CATEGORY_TABS.find((t) => t.id === category)?.label ?? 'All';

  const chips = [
    { label: 'Synced', value: syncedAt },
    { label: 'Category', value: categoryLabel },
    { label: 'Action', value: actionLabel, warn: actionLabel !== 'Any' },
    { label: 'Org', value: orgLabel, warn: orgLabel !== 'Any' }
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
              'max-w-[7.5rem] truncate font-mono text-[11px] font-semibold text-brand-foreground',
              chip.label === 'Org' && 'uppercase tabular-nums'
            )}
          >
            {chip.value}
          </span>
        </span>
      ))}
    </div>
  );
}

function AuditHero({
  level,
  filtered,
  syncedAt,
  actionLabel,
  orgLabel,
  category,
  statStrip,
  headerAction
}: {
  level: AuditLevel;
  filtered: boolean;
  syncedAt: string;
  actionLabel: string;
  orgLabel: string;
  category: ActionCategory;
  statStrip: { label: string; value: string; hint: string }[];
  headerAction: ReactNode;
}) {
  const headerClass =
    level === 'attention'
      ? 'border-b border-amber-500/35 bg-[color-mix(in_srgb,var(--gold)_18%,var(--brand))]'
      : 'border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand';

  return (
    <div className='overflow-hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card'>
      <div className={cn('px-3 py-3 sm:px-5 sm:py-4', headerClass)}>
        <div className='flex flex-col gap-3 md:flex-row md:items-center md:justify-between md:gap-4'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
           
            <div className='min-w-0'>
              
              <h2 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground sm:text-xl xl:text-2xl'>
                {levelHeadline(level, filtered)}
              </h2>
              <p className=' line-clamp-2 text-sm text-brand-foreground/80 md:max-w-xl xl:max-w-2xl'>
                {levelSubtitle(level, filtered)}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 md:shrink-0'>
            <AuditHeroMetaChips
              syncedAt={syncedAt}
              actionLabel={actionLabel}
              orgLabel={orgLabel}
              category={category}
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

function ActionInsightCard({
  label,
  detail,
  count,
  max,
  state,
  icon
}: {
  label: string;
  detail: string;
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
          className={cn('rounded-full text-[10px] font-semibold tabular-nums', badgeClass(state))}
        >
          {count.toLocaleString()} · sample
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

type Advisory = {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
};

function buildAdvisories(
  overview: AdminOverview | undefined,
  filtered: boolean
): Advisory[] {
  const list: Advisory[] = [];
  const recent = overview?.recent_audit ?? [];

  if (recent.some((r) => r.action.includes('suspend'))) {
    list.push({
      id: 'suspend',
      severity: 'warning',
      title: 'Workspace suspension recorded',
      detail:
        'A tenant was suspended recently. Confirm the reason in org detail before reactivating.'
    });
  }
  if (recent.some((r) => r.action.startsWith('impersonation.'))) {
    list.push({
      id: 'impersonate',
      severity: 'info',
      title: 'Impersonation on the timeline',
      detail:
        'Support sessions are logged with actor and organization. Review duration and scope after each ticket.'
    });
  }
  if (filtered) {
    list.push({
      id: 'filtered',
      severity: 'info',
      title: 'Filters are narrowing results',
      detail:
        'Totals in the stat strip reflect the filtered query, not the entire audit store.'
    });
  }
  if (list.length === 0) {
    list.push({
      id: 'all-clear',
      severity: 'info',
      title: 'No outstanding advisories',
      detail:
        'Keep using category tabs or action keys when investigating a specific incident.'
    });
  }
  return list;
}

function CategoryTabs({
  value,
  onChange
}: {
  value: ActionCategory;
  onChange: (id: ActionCategory) => void;
}) {
  return (
    <div
      className='flex flex-wrap gap-1 rounded-xl border border-border bg-muted/30 p-1'
      role='tablist'
      aria-label='Action category'
    >
      {CATEGORY_TABS.map((tab) => (
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

function AuditSkeleton() {
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

function resolveCategory(action: string | null, category: ActionCategory): ActionCategory {
  if (category !== 'all') return category;
  if (!action) return 'all';
  if (action.startsWith('org.')) return 'org';
  if (action.startsWith('user.')) return 'user';
  if (action.startsWith('impersonation.')) return 'impersonation';
  return 'all';
}

export default function AdminAuditPage() {
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(25),
    action: parseAsString,
    org: parseAsString,
    category: parseAsString.withDefault('all')
  });

  const [actionDraft, setActionDraft] = useState(params.action ?? '');
  const [orgDraft, setOrgDraft] = useState(params.org ?? '');

  const category = (
    CATEGORY_TABS.some((t) => t.id === params.category)
      ? params.category
      : 'all'
  ) as ActionCategory;

  const debouncedSetAction = useDebouncedCallback((value: string) => {
    void setParams({ action: value.trim() || null, page: 1 });
  }, 350);

  const debouncedSetOrg = useDebouncedCallback((value: string) => {
    void setParams({ org: value.trim() || null, page: 1 });
  }, 350);

  const urlAction = params.action ?? '';
  const [prevUrlAction, setPrevUrlAction] = useState(urlAction);
  if (urlAction !== prevUrlAction) {
    setPrevUrlAction(urlAction);
    setActionDraft(urlAction);
  }

  const urlOrg = params.org ?? '';
  const [prevUrlOrg, setPrevUrlOrg] = useState(urlOrg);
  if (urlOrg !== prevUrlOrg) {
    setPrevUrlOrg(urlOrg);
    setOrgDraft(urlOrg);
  }

  const effectiveAction = useMemo(() => {
    const typed = params.action?.trim();
    if (typed) return typed;
    const tab = CATEGORY_TABS.find((t) => t.id === category);
    return tab?.filter;
  }, [category, params.action]);

  const skip = (params.page - 1) * params.perPage;
  const listQuery = useMemo(
    () => ({
      action: effectiveAction,
      organization_id: params.org?.trim() || undefined,
      skip,
      limit: params.perPage
    }),
    [effectiveAction, params.org, params.perPage, skip]
  );

  const overviewQuery = useQuery({
    ...adminOverviewQueryOptions(),
    staleTime: 60_000
  });

  const totalQuery = useQuery(adminAuditQueryOptions({ limit: 1, skip: 0 }));

  const sampleQuery = useQuery(
    adminAuditQueryOptions({ limit: 120, skip: 0 })
  );

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery(
    adminAuditQueryOptions(listQuery)
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / params.perPage)) : 1;

  const columns = useMemo(() => createAdminAuditColumns(), []);

  const { table } = useDataTable({
    data: data?.items ?? [],
    columns,
    pageCount,
    shallow: true,
    initialState: { pagination: { pageIndex: 0, pageSize: params.perPage } }
  });

  const setCategory = useCallback(
    (next: ActionCategory) => {
      void setParams({
        category: next === 'all' ? null : next,
        action: null,
        page: 1
      });
      setActionDraft('');
    },
    [setParams]
  );

  const filtered = Boolean(
    params.action?.trim() || params.org?.trim() || category !== 'all'
  );

  const overview = overviewQuery.data;
  const recent = overview?.recent_audit ?? [];
  const level = auditLevel(filtered, recent);

  const sampleItems = sampleQuery.data?.items ?? [];
  const insightCounts = ACTION_INSIGHTS.map((insight) => ({
    ...insight,
    count: countForInsight(sampleItems, insight.prefix)
  }));
  const insightMax = Math.max(1, ...insightCounts.map((i) => i.count));

  const sensitiveOnPage = (data?.items ?? []).filter((r) =>
    isSensitiveAction(r.action)
  ).length;

  const statStrip = [
    {
      label: 'Recorded',
      value: totalQuery.data?.total.toLocaleString() ?? '—',
      hint: 'All time in store'
    },
    {
      label: 'Matching',
      value: data?.total.toLocaleString() ?? '—',
      hint: filtered ? 'Current filters' : 'No filters'
    },
    {
      label: 'This page',
      value: data?.items.length.toLocaleString() ?? '—',
      hint: `Up to ${params.perPage} rows`
    },
    {
      label: 'Sensitive',
      value: sensitiveOnPage.toLocaleString(),
      hint: 'Suspend · impersonation · flags'
    }
  ];

  const actionLabel = params.action?.trim()
    ? params.action.trim()
    : category !== 'all'
      ? (CATEGORY_TABS.find((t) => t.id === category)?.label ?? 'Any')
      : 'Any';

  const orgLabel = params.org?.trim()
    ? params.org.trim().slice(0, 8)
    : 'Any';

  const refreshButton = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        void refetch();
        void totalQuery.refetch();
        void sampleQuery.refetch();
        void overviewQuery.refetch();
      }}
      disabled={
        isFetching ||
        totalQuery.isFetching ||
        sampleQuery.isFetching ||
        overviewQuery.isFetching
      }
      className='h-9 rounded-xl border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card text-primary hover:bg-[color-mix(in_srgb,var(--card)_88%,white)]'
    >
      <Icons.spinner
        className={cn(
          'mr-1.5 size-3.5',
          (isFetching ||
            totalQuery.isFetching ||
            sampleQuery.isFetching ||
            overviewQuery.isFetching) &&
            'animate-spin'
        )}
      />
      {isFetching ? 'Syncing…' : 'Sync log'}
    </Button>
  );

  const syncedAt = formatSyncTime(dataUpdatedAt);
  const showSkeleton =
    isLoading && !data && totalQuery.isLoading && overviewQuery.isLoading;

  return (
    <PageContainer
      pageTitle='Activity log'
      pageDescription='Immutable audit trail for admin mutations, support access, and sensitive platform changes.'
    >
      <div className='space-y-6'>
        {error ? (
          <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load audit log'}
          </div>
        ) : null}

        {showSkeleton ? (
          <AuditSkeleton />
        ) : (
          <>
            <AuditHero
              level={level}
              filtered={filtered}
              syncedAt={syncedAt}
              actionLabel={actionLabel}
              orgLabel={orgLabel}
              category={resolveCategory(params.action, category)}
              statStrip={statStrip}
              headerAction={refreshButton}
            />

            <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <section className='space-y-3'>
                <div>
                  <h2 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                    By action type
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    Mix from the latest {sampleItems.length || '…'} events — not a full historical breakdown.
                  </p>
                </div>
                {sampleQuery.isLoading ? (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className='h-40 rounded-[1.125rem]' />
                    ))}
                  </div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {insightCounts.map((insight) => {
                      const state: CheckState =
                        insight.count === 0
                          ? 'neutral'
                          : insight.key === 'impersonation' || insight.key === 'org'
                            ? insight.count >= 2
                              ? 'warn'
                              : 'pass'
                            : 'pass';
                      return (
                        <ActionInsightCard
                          key={insight.key}
                          label={insight.label}
                          detail={insight.detail}
                          count={insight.count}
                          max={insightMax}
                          state={state}
                          icon={insight.icon}
                        />
                      );
                    })}
                  </div>
                )}
              </section>

              <SurvaiPanel className='flex h-full flex-col'>
                <SurvaiPanelHeader
                  tone='soft'
                  icon={<Icons.warning className='size-3.5' />}
                  title='Operator advisories'
                  subtitle='High-signal admin actions from the overview feed'
                />
                <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
                  {buildAdvisories(overview, filtered).map((item) => (
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

                  {recent.length > 0 ? (
                    <div className='mt-1 border-t border-border pt-3'>
                      <p className='mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                        Latest events
                      </p>
                      <div className='scrollbar-thin max-h-48 space-y-1.5 overflow-y-auto pr-0.5'>
                        {recent.slice(0, 6).map((row) => (
                          <div
                            key={row.id}
                            className={cn(
                              'rounded-xl border px-3 py-2',
                              isSensitiveAction(row.action)
                                ? 'border-amber-500/30 bg-amber-500/[0.06]'
                                : 'border-border bg-muted/20'
                            )}
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <p className='text-xs font-semibold text-foreground'>
                                {formatAction(row.action)}
                              </p>
                              <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>
                                {relativeTime(row.created_at)}
                              </span>
                            </div>
                            <p className='mt-0.5 truncate text-[11px] text-muted-foreground'>
                              {row.actor_email ?? 'system'}
                              {row.organization_id
                                ? ` · org ${row.organization_id.slice(0, 8)}`
                                : ''}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </SurvaiPanelBody>
                <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                  <span className='font-mono text-[10px] uppercase tracking-wide'>
                    GET /admin/audit-log
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
                icon={<Icons.activity className='size-3.5' />}
                title='Audit log'
                subtitle='Category tabs, action key search, and organization scope'
              />
              <SurvaiPanelBody className='space-y-4'>
                <CategoryTabs value={category} onChange={setCategory} />

                <div className='grid gap-3 sm:grid-cols-2'>
                  <div className='relative'>
                    <Icons.search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      value={actionDraft}
                      onChange={(e) => {
                        setActionDraft(e.target.value);
                        debouncedSetAction(e.target.value);
                        if (e.target.value.trim()) {
                          void setParams({ category: null });
                        }
                      }}
                      placeholder='Action key (e.g. org.suspend)…'
                      className='h-10 rounded-xl border-border bg-card pl-9'
                    />
                  </div>
                  <Input
                    value={orgDraft}
                    onChange={(e) => {
                      setOrgDraft(e.target.value);
                      debouncedSetOrg(e.target.value);
                    }}
                    placeholder='Organization ID (optional)…'
                    className='h-10 rounded-xl border-border bg-card font-mono text-sm'
                  />
                </div>

                {isLoading ? (
                  <DataTableSkeleton columnCount={6} rowCount={10} withViewOptions={false} />
                ) : (
                  <DataTable
                    table={table}
                    rowNoun='events'
                    emptyTitle='No audit events'
                    emptyDescription={
                      filtered
                        ? 'Try clearing filters or widening the action search.'
                        : 'Sensitive admin actions will appear here as they occur.'
                    }
                    emptyIcon={<Icons.activity className='size-5 text-foreground' />}
                  />
                )}

                {data ? (
                  <p className='text-center font-mono text-[11px] text-muted-foreground'>
                    Showing {data.items.length.toLocaleString()} of{' '}
                    {data.total.toLocaleString()}
                    {effectiveAction ? ` · action “${effectiveAction}”` : ''}
                    {params.org ? ` · org ${params.org.slice(0, 8)}…` : ''}
                  </p>
                ) : null}
              </SurvaiPanelBody>
            </SurvaiPanel>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.code className='size-3.5' />}
                title='What we capture'
                subtitle='Actor, resource, organization, and request metadata'
              />
              <SurvaiPanelBody>
                <div className='grid gap-4 md:grid-cols-3'>
                  {(
                    [
                      {
                        title: 'Who',
                        body: 'System admins and automated paths record actor email or user id, plus client IP when available.'
                      },
                      {
                        title: 'What',
                        body: 'Stable action keys (org.suspend, user.create, impersonation.start) map to resource type and id for tracing.'
                      },
                      {
                        title: 'Where',
                        body: 'Organization id ties workspace-scoped changes to org detail — open the org row to continue an investigation.'
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
