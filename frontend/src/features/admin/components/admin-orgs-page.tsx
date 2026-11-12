'use client';

import Link from 'next/link';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import {
  adminKeys,
  adminOrgsQueryOptions,
  adminOverviewQueryOptions
} from '@/features/admin/api/queries';
import { patchAdminOrg, startImpersonation } from '@/features/admin/api/service';
import type { AdminOrg, AdminOverview } from '@/features/admin/api/types';
import { createAdminOrgColumns } from '@/features/admin/components/orgs/columns';
import { relativeTime } from '@/features/admin/components/overview/format';
import {
  brandToolbarButtonClass,
  FilterTabList,
  formatAdminSyncTime,
  OperatorHero,
  OperatorInsightCard,
  OperatorPageSkeleton,
  type CheckState,
  type MetaChip,
  type OperatorLevel
} from '@/features/admin/components/shared/operator-page-chrome';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { setApiAccessToken, setApiRefreshToken } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'active' | 'suspended';

const STATUS_TABS: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'active', label: 'Active' },
  { id: 'suspended', label: 'Suspended' }
];

function statusToActive(status: StatusFilter): boolean | undefined {
  if (status === 'active') return true;
  if (status === 'suspended') return false;
  return undefined;
}

function orgLevel(
  suspended: number,
  filtered: boolean
): OperatorLevel {
  if (suspended > 0) return 'attention';
  if (filtered) return 'attention';
  return 'operational';
}

function orgHeadline(level: OperatorLevel, filtered: boolean) {
  if (filtered) return 'Filtered workspace directory';
  return level === 'attention'
    ? 'Suspended tenants on platform'
    : 'Workspaces healthy';
}

function orgSubtitle(level: OperatorLevel, filtered: boolean, suspended: number) {
  if (filtered) {
    return 'Search and status tabs narrow the table — open a row for members, surveys, and feature flags.';
  }
  if (suspended > 0) {
    return `${suspended} organization${suspended === 1 ? '' : 's'} blocked from sign-in — review before reactivating or impersonating.`;
  }
  return 'Search workspaces, suspend access, or impersonate for support without leaving this directory.';
}

function buildOrgAdvisories(
  overview: AdminOverview | undefined,
  suspended: number,
  filtered: boolean
) {
  const list: {
    id: string;
    severity: 'warning' | 'info';
    title: string;
    detail: string;
  }[] = [];

  if (suspended > 0) {
    list.push({
      id: 'suspended',
      severity: 'warning',
      title: `${suspended} suspended workspace${suspended === 1 ? '' : 's'}`,
      detail:
        'Members cannot sign in. Data is retained; publishing and collection stop until reactivation.'
    });
  }

  overview?.alerts
    .filter((a) => a.href.includes('/admin/orgs'))
    .forEach((alert) => {
      list.push({
        id: alert.id,
        severity: alert.severity === 'warning' ? 'warning' : 'info',
        title: alert.title,
        detail: alert.detail
      });
    });

  if (filtered) {
    list.push({
      id: 'filtered',
      severity: 'info',
      title: 'Directory filters applied',
      detail: 'Totals in the stat strip match the current query, not necessarily the whole platform.'
    });
  }

  if (list.length === 0) {
    list.push({
      id: 'clear',
      severity: 'info',
      title: 'No workspace advisories',
      detail:
        'Use impersonation for support tickets and suspend only with a documented reason.'
    });
  }

  return list;
}

export default function AdminOrgsPage() {
  const queryClient = useQueryClient();
  const { setUserFromApi } = useAuth();
  const router = useRouter();

  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(20),
    q: parseAsString,
    status: parseAsString.withDefault('all')
  });

  const [searchDraft, setSearchDraft] = useState(params.q ?? '');
  const [suspendTarget, setSuspendTarget] = useState<AdminOrg | null>(null);
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    void setParams({ q: value.trim() || null, page: 1 });
  }, 350);

  useEffect(() => {
    setSearchDraft(params.q ?? '');
  }, [params.q]);

  const status = (params.status === 'active' || params.status === 'suspended'
    ? params.status
    : 'all') as StatusFilter;

  const countQueries = useQueries({
    queries: [
      adminOrgsQueryOptions({ limit: 1 }),
      adminOrgsQueryOptions({ active: true, limit: 1 }),
      adminOrgsQueryOptions({ active: false, limit: 1 })
    ]
  });

  const overviewQuery = useQuery({
    ...adminOverviewQueryOptions(),
    staleTime: 60_000
  });

  const suspendMut = useMutation({
    mutationFn: ({
      id,
      is_active,
      reason
    }: {
      id: string;
      is_active: boolean;
      reason?: string;
    }) =>
      patchAdminOrg(id, {
        is_active,
        suspended_reason: reason
      }),
    onMutate: ({ id }) => setPendingOrgId(id),
    onSettled: () => setPendingOrgId(null),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.orgs() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
      toast.success(vars.is_active ? 'Organization reactivated' : 'Organization suspended');
      setSuspendTarget(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const impersonate = useCallback(
    async (org: AdminOrg) => {
      setPendingOrgId(org.id);
      try {
        const result = await startImpersonation(org.id);
        setApiAccessToken(result.access_token);
        setApiRefreshToken(result.refresh_token);
        setUserFromApi({
          ...result.user,
          impersonation: true,
          impersonator_id: result.impersonator_id
        } as never);
        toast.success(`Impersonating ${result.organization_name}`);
        router.push('/dashboard/overview');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Impersonation failed');
      } finally {
        setPendingOrgId(null);
      }
    },
    [router, setUserFromApi]
  );

  const columns = useMemo(
    () =>
      createAdminOrgColumns({
        onImpersonate: (org) => void impersonate(org),
        onSuspendToggle: (org) => {
          if (org.is_active) setSuspendTarget(org);
          else {
            suspendMut.mutate({ id: org.id, is_active: true });
          }
        },
        pendingOrgId
      }),
    [impersonate, pendingOrgId, suspendMut]
  );

  const skip = (params.page - 1) * params.perPage;

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery(
    adminOrgsQueryOptions({
      search: params.q?.trim() || undefined,
      active: statusToActive(status),
      skip,
      limit: params.perPage
    })
  );

  const pageCount = data
    ? Math.max(1, Math.ceil(data.total / params.perPage))
    : 1;

  const { table } = useDataTable({
    data: data?.organizations ?? [],
    columns,
    pageCount,
    shallow: true,
    initialState: { pagination: { pageIndex: 0, pageSize: params.perPage } }
  });

  const setStatus = useCallback(
    (next: StatusFilter) => {
      void setParams({ status: next === 'all' ? null : next, page: 1 });
    },
    [setParams]
  );

  const totalOrgs = countQueries[0].data?.total ?? overviewQuery.data?.orgs_total;
  const activeOrgs = countQueries[1].data?.total ?? overviewQuery.data?.orgs_active;
  const suspendedOrgs =
    countQueries[2].data?.total ?? overviewQuery.data?.orgs_suspended ?? 0;

  const filtered = Boolean(params.q?.trim() || status !== 'all');
  const level = orgLevel(suspendedOrgs ?? 0, filtered);
  const overview = overviewQuery.data;

  const statStrip = [
    {
      label: 'Workspaces',
      value: totalOrgs?.toLocaleString() ?? '—',
      hint: 'Registered orgs'
    },
    {
      label: 'Active',
      value: activeOrgs?.toLocaleString() ?? '—',
      hint: 'Can sign in'
    },
    {
      label: 'Suspended',
      value: suspendedOrgs?.toLocaleString() ?? '—',
      hint: 'Access blocked'
    },
    {
      label: 'Matching',
      value: data?.total.toLocaleString() ?? '—',
      hint: filtered ? 'Current filters' : 'Listed rows'
    }
  ];

  const insightItems = useMemo(() => {
    const published = overview?.surveys_published ?? 0;
    const drafts = overview?.surveys_draft ?? 0;
    return [
      {
        key: 'active',
        label: 'Active tenants',
        detail: 'Owners and members can authenticate',
        count: activeOrgs ?? 0,
        badge: `${(activeOrgs ?? 0).toLocaleString()} live`,
        icon: <Icons.workspace className='size-4' />,
        state: 'pass' as CheckState
      },
      {
        key: 'suspended',
        label: 'Suspended',
        detail: 'Reactivate from the row menu or org detail',
        count: suspendedOrgs ?? 0,
        badge: `${(suspendedOrgs ?? 0).toLocaleString()} blocked`,
        icon: <Icons.lock className='size-4' />,
        state: ((suspendedOrgs ?? 0) > 0 ? 'warn' : 'neutral') as CheckState
      },
      {
        key: 'published',
        label: 'Published surveys',
        detail: 'Across all workspaces · platform total',
        count: published,
        badge: `${published.toLocaleString()} live`,
        icon: <Icons.survey className='size-4' />,
        state: 'pass' as CheckState
      },
      {
        key: 'drafts',
        label: 'Draft surveys',
        detail: 'Not yet collecting responses',
        count: drafts,
        badge: `${drafts.toLocaleString()} drafts`,
        icon: <Icons.edit className='size-4' />,
        state: 'neutral' as CheckState
      }
    ];
  }, [activeOrgs, overview?.surveys_draft, overview?.surveys_published, suspendedOrgs]);

  const insightMax = Math.max(1, ...insightItems.map((i) => i.count));

  const chips: MetaChip[] = [
    { label: 'Synced', value: formatAdminSyncTime(dataUpdatedAt) },
    {
      label: 'Status',
      value: STATUS_TABS.find((t) => t.id === status)?.label ?? 'All',
      warn: status !== 'all'
    },
    {
      label: 'Search',
      value: params.q?.trim() ? params.q.trim() : 'Any',
      warn: Boolean(params.q?.trim())
    }
  ];

  const syncActions: ReactNode = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => {
        void refetch();
        void overviewQuery.refetch();
        countQueries.forEach((q) => void q.refetch());
      }}
      disabled={isFetching || overviewQuery.isFetching}
      className={brandToolbarButtonClass}
    >
      <Icons.spinner
        className={cn(
          'mr-1.5 size-3.5',
          (isFetching || overviewQuery.isFetching) && 'animate-spin'
        )}
      />
      Sync directory
    </Button>
  );

  const showSkeleton =
    isLoading && !data && countQueries.some((q) => q.isLoading);

  return (
    <PageContainer
      pageTitle='Organizations'
      pageDescription='Workspace directory with suspend, impersonate, and per-org inspection.'
    >
      <div className='space-y-6'>
        {error ? (
          <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load organizations'}
          </div>
        ) : null}

        {showSkeleton ? (
          <OperatorPageSkeleton />
        ) : (
          <>
            <OperatorHero
              kicker='Organizations'
              headline={orgHeadline(level, filtered)}
              subtitle={orgSubtitle(level, filtered, suspendedOrgs ?? 0)}
              level={level}
              chips={chips}
              headerAction={syncActions}
              statStrip={statStrip}
            />

            <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <section className='space-y-3'>
                <div>
                  <h2 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                    Platform mix
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    Tenant posture and survey footprint from overview aggregates.
                  </p>
                </div>
                {overviewQuery.isLoading && !overview ? (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className='h-40 rounded-[1.125rem]' />
                    ))}
                  </div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {insightItems.map((item) => (
                      <OperatorInsightCard
                        key={item.key}
                        label={item.label}
                        detail={item.detail}
                        badge={item.badge}
                        count={item.count}
                        max={insightMax}
                        state={item.state}
                        icon={item.icon}
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
                  subtitle='Workspace risk signals'
                />
                <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
                  {buildOrgAdvisories(overview, suspendedOrgs ?? 0, filtered).map(
                    (item) => (
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
                    )
                  )}

                  {overview?.recent_orgs.length ? (
                    <div className='mt-1 border-t border-border pt-3'>
                      <p className='mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                        Newest workspaces
                      </p>
                      <div className='scrollbar-thin max-h-48 space-y-1.5 overflow-y-auto pr-0.5'>
                        {overview.recent_orgs.slice(0, 6).map((org) => (
                          <Link
                            key={org.id}
                            href={`/admin/orgs/${org.id}`}
                            className={cn(
                              'block rounded-xl border px-3 py-2 transition-colors hover:bg-muted/30',
                              org.is_active
                                ? 'border-border bg-muted/20'
                                : 'border-amber-500/30 bg-amber-500/[0.06]'
                            )}
                          >
                            <div className='flex items-start justify-between gap-2'>
                              <p className='text-xs font-semibold text-foreground'>
                                {org.name}
                              </p>
                              <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>
                                {relativeTime(org.created_at)}
                              </span>
                            </div>
                            <p className='mt-0.5 text-[11px] text-muted-foreground'>
                              {org.member_count} members · {org.survey_count} surveys
                              {!org.is_active ? ' · suspended' : ''}
                            </p>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </SurvaiPanelBody>
                <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                  <span className='font-mono text-[10px] uppercase tracking-wide'>
                    GET /admin/orgs
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
                icon={<Icons.workspace className='size-3.5' />}
                title='Workspace directory'
                subtitle='Search, filter by status, impersonate, or open detail'
              />
              <SurvaiPanelBody className='space-y-4'>
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center'>
                  <FilterTabList
                    ariaLabel='Organization status'
                    items={STATUS_TABS}
                    value={status}
                    onChange={setStatus}
                    className='sm:w-fit'
                  />
                  <div className='relative min-w-0 flex-1 sm:max-w-md sm:ml-auto'>
                    <Icons.search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      value={searchDraft}
                      onChange={(e) => {
                        setSearchDraft(e.target.value);
                        debouncedSetSearch(e.target.value);
                      }}
                      placeholder='Search by organization name…'
                      className='h-10 rounded-xl border-border bg-card pl-9'
                    />
                  </div>
                </div>

                {isLoading ? (
                  <DataTableSkeleton columnCount={7} rowCount={8} withViewOptions={false} />
                ) : (
                  <DataTable
                    table={table}
                    rowNoun='organizations'
                    emptyTitle='No organizations found'
                    emptyDescription={
                      params.q
                        ? 'Try a different search term or clear filters.'
                        : 'New workspaces appear here when owners sign up.'
                    }
                    emptyIcon={<Icons.workspace className='size-5 text-foreground' />}
                  />
                )}

                {data ? (
                  <p className='text-center font-mono text-[11px] text-muted-foreground'>
                    Showing {data.organizations.length.toLocaleString()} of{' '}
                    {data.total.toLocaleString()}
                    {status !== 'all' ? ` · ${status}` : ''}
                    {params.q ? ` · search “${params.q}”` : ''}
                  </p>
                ) : null}
              </SurvaiPanelBody>
            </SurvaiPanel>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.code className='size-3.5' />}
                title='Operator actions'
                subtitle='What you can do from this directory'
              />
              <SurvaiPanelBody>
                <div className='grid gap-4 md:grid-cols-3'>
                  {(
                    [
                      {
                        title: 'Inspect',
                        body: 'Org detail shows members, surveys, feature flags, and admin notes without impersonating.'
                      },
                      {
                        title: 'Impersonate',
                        body: 'Starts a support session as the workspace owner — logged in audit and restores your admin token after exit.'
                      },
                      {
                        title: 'Suspend',
                        body: 'Blocks sign-in for every member while keeping data. Reactivate from the row menu when the issue is resolved.'
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

      <AlertDialog
        open={suspendTarget != null}
        onOpenChange={(open) => {
          if (!open) setSuspendTarget(null);
        }}
      >
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {suspendTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Members lose access until you reactivate this workspace. Surveys stay in the
              database; publishing and collection stop for suspended orgs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={suspendMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant='destructive'
              disabled={suspendMut.isPending}
              onClick={() => {
                if (!suspendTarget) return;
                suspendMut.mutate({
                  id: suspendTarget.id,
                  is_active: false,
                  reason: 'Suspended by platform admin'
                });
              }}
            >
              {suspendMut.isPending ? 'Suspending…' : 'Suspend organization'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
