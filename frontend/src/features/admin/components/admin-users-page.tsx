'use client';

import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

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
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/ui/table/data-table';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
import {
  adminKeys,
  adminOverviewQueryOptions,
  adminUsersQueryOptions
} from '@/features/admin/api/queries';
import { createAdminUser, patchAdminUser } from '@/features/admin/api/service';
import type { AdminOverview, AdminUser } from '@/features/admin/api/types';
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
import {
  adminUserRoleLabel,
  createAdminUserColumns
} from '@/features/admin/components/users/columns';
import { useDataTable } from '@/hooks/use-data-table';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

type RoleFilter = 'all' | AdminUser['role'];

const ROLE_TABS: { id: RoleFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'organization', label: 'Owners' },
  { id: 'researcher', label: 'Researchers' },
  { id: 'viewer', label: 'Viewers' },
  { id: 'system_admin', label: 'Admins' }
];

const EMPTY_FORM = {
  email: '',
  full_name: '',
  password: '',
  role: 'organization' as AdminUser['role'],
  organization_name: ''
};

function usersLevel(
  inactive: number,
  filtered: boolean
): OperatorLevel {
  if (inactive > 0) return 'attention';
  if (filtered) return 'attention';
  return 'operational';
}

function usersHeadline(level: OperatorLevel, filtered: boolean) {
  if (filtered) return 'Filtered user directory';
  return level === 'attention'
    ? 'Inactive accounts present'
    : 'Accounts healthy';
}

function usersSubtitle(
  inactive: number,
  filtered: boolean,
  signups7d: number
) {
  if (filtered) {
    return 'Role tabs and search narrow the table — deactivate from the row menu when offboarding someone.';
  }
  if (inactive > 0) {
    return `${inactive} deactivated account${inactive === 1 ? '' : 's'} cannot sign in. ${signups7d} new signup${signups7d === 1 ? '' : 's'} in the last 7 days.`;
  }
  return 'Provision owners and researchers, filter by seat role, or deactivate access platform-wide.';
}

function buildUserAdvisories(overview: AdminOverview | undefined, filtered: boolean) {
  const list: {
    id: string;
    severity: 'warning' | 'info';
    title: string;
    detail: string;
  }[] = [];

  overview?.alerts
    .filter((a) => a.href.includes('/admin/users'))
    .forEach((alert) => {
      list.push({
        id: alert.id,
        severity: alert.severity === 'warning' ? 'warning' : 'info',
        title: alert.title,
        detail: alert.detail
      });
    });

  if ((overview?.users_inactive ?? 0) > 0) {
    list.push({
      id: 'inactive',
      severity: 'info',
      title: `${overview?.users_inactive} inactive account${overview?.users_inactive === 1 ? '' : 's'}`,
      detail: 'Reactivate from the row menu if access should be restored.'
    });
  }

  if (filtered) {
    list.push({
      id: 'filtered',
      severity: 'info',
      title: 'Directory filters applied',
      detail: 'Matching count reflects the query below, not always total platform users.'
    });
  }

  if (list.length === 0) {
    list.push({
      id: 'clear',
      severity: 'info',
      title: 'No user advisories',
      detail: 'Create users for pilots or use deactivate for offboarding — changes sync to overview KPIs.'
    });
  }

  return list;
}

function roleIcon(role: string) {
  switch (role) {
    case 'organization':
      return <Icons.workspace className='size-4' />;
    case 'researcher':
      return <Icons.plan className='size-4' />;
    case 'viewer':
      return <Icons.eye className='size-4' />;
    case 'system_admin':
      return <Icons.settings className='size-4' />;
    default:
      return <Icons.user className='size-4' />;
  }
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(20),
    q: parseAsString,
    role: parseAsString.withDefault('all')
  });

  const [searchDraft, setSearchDraft] = useState(params.q ?? '');
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const debouncedSetSearch = useDebouncedCallback((value: string) => {
    void setParams({ q: value.trim() || null, page: 1 });
  }, 350);

  useEffect(() => {
    setSearchDraft(params.q ?? '');
  }, [params.q]);

  const roleFilter = (
    ROLE_TABS.some((t) => t.id === params.role) ? params.role : 'all'
  ) as RoleFilter;

  const overviewQuery = useQuery({
    ...adminOverviewQueryOptions(),
    staleTime: 60_000
  });

  const adminCountQuery = useQuery(
    adminUsersQueryOptions({ role: 'system_admin', limit: 1 })
  );

  const skip = (params.page - 1) * params.perPage;
  const listQuery = useMemo(
    () => ({
      search: params.q?.trim() || undefined,
      role: roleFilter === 'all' ? undefined : roleFilter,
      skip,
      limit: params.perPage
    }),
    [params.perPage, params.q, roleFilter, skip]
  );

  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery(
    adminUsersQueryOptions(listQuery)
  );

  const pageCount = data ? Math.max(1, Math.ceil(data.total / params.perPage)) : 1;

  const toggleActiveMut = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      patchAdminUser(id, { is_active }),
    onMutate: ({ id }) => setPendingUserId(id),
    onSettled: () => setPendingUserId(null),
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
      toast.success(vars.is_active ? 'User activated' : 'User deactivated');
      setDeactivateTarget(null);
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const createMut = useMutation({
    mutationFn: () =>
      createAdminUser({
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        password: form.password,
        role: form.role,
        organization_name: form.organization_name.trim() || null,
        email_verified: true
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminKeys.users() });
      void queryClient.invalidateQueries({ queryKey: adminKeys.overview() });
      setShowCreate(false);
      setForm(EMPTY_FORM);
      toast.success('User created');
    },
    onError: (err: Error) => toast.error(err.message)
  });

  const columns = useMemo(
    () =>
      createAdminUserColumns({
        pendingUserId,
        onToggleActive: (user) => {
          if (user.is_active) setDeactivateTarget(user);
          else toggleActiveMut.mutate({ id: user.id, is_active: true });
        }
      }),
    [pendingUserId, toggleActiveMut]
  );

  const { table } = useDataTable({
    data: data?.users ?? [],
    columns,
    pageCount,
    shallow: true,
    initialState: { pagination: { pageIndex: 0, pageSize: params.perPage } }
  });

  const setRoleFilter = useCallback(
    (next: RoleFilter) => {
      void setParams({ role: next === 'all' ? null : next, page: 1 });
    },
    [setParams]
  );

  const overview = overviewQuery.data;
  const filtered = Boolean(params.q?.trim() || roleFilter !== 'all');
  const inactive = overview?.users_inactive ?? 0;
  const level = usersLevel(inactive, filtered);

  const statStrip = [
    {
      label: 'Accounts',
      value: overview?.users_total?.toLocaleString() ?? '—',
      hint: 'All platform users'
    },
    {
      label: 'Active',
      value: overview?.users_active?.toLocaleString() ?? '—',
      hint: 'Can sign in'
    },
    {
      label: 'Inactive',
      value: overview?.users_inactive?.toLocaleString() ?? '—',
      hint: 'Deactivated'
    },
    {
      label: 'Matching',
      value: data?.total.toLocaleString() ?? '—',
      hint: filtered ? 'Current filters' : 'Listed rows'
    }
  ];

  const roleBreakdown = overview?.user_roles ?? [];
  const breakdownMax = Math.max(1, ...roleBreakdown.map((r) => r.count));

  const chips: MetaChip[] = [
    { label: 'Synced', value: formatAdminSyncTime(dataUpdatedAt) },
    {
      label: 'Role',
      value: roleFilter === 'all' ? 'Any' : adminUserRoleLabel(roleFilter),
      warn: roleFilter !== 'all'
    },
    {
      label: 'Search',
      value: params.q?.trim() ? params.q.trim() : 'Any',
      warn: Boolean(params.q?.trim())
    },
    {
      label: 'Admins',
      value: adminCountQuery.data?.total.toLocaleString() ?? '—'
    }
  ];

  const headerActions: ReactNode = (
    <>
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={() => {
          void refetch();
          void overviewQuery.refetch();
          void adminCountQuery.refetch();
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
      <Button
        type='button'
        size='sm'
        className='h-9 rounded-xl'
        onClick={() => setShowCreate((v) => !v)}
      >
        {showCreate ? 'Close' : 'Create user'}
      </Button>
    </>
  );

  const showSkeleton = isLoading && !data && overviewQuery.isLoading;

  return (
    <PageContainer
      pageTitle='Users'
      pageDescription='Account directory with role filters, provisioning, and deactivate controls.'
    >
      <div className='space-y-6'>
        {error ? (
          <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load users'}
          </div>
        ) : null}

        {showSkeleton ? (
          <OperatorPageSkeleton />
        ) : (
          <>
            <OperatorHero
              kicker='Users'
              headline={usersHeadline(level, filtered)}
              subtitle={usersSubtitle(
                inactive,
                filtered,
                overview?.users_7d ?? 0
              )}
              level={level}
              chips={chips}
              headerAction={headerActions}
              statStrip={statStrip}
            />

            <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <section className='space-y-3'>
                <div>
                  <h2 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                    By seat role
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    Platform-wide role distribution from overview.
                  </p>
                </div>
                {overviewQuery.isLoading && !overview ? (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className='h-40 rounded-[1.125rem]' />
                    ))}
                  </div>
                ) : roleBreakdown.length === 0 ? (
                  <div className='rounded-[1.125rem] border border-border bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground'>
                    No role breakdown yet.
                  </div>
                ) : (
                  <div className='grid gap-3 sm:grid-cols-2'>
                    {roleBreakdown.slice(0, 4).map((item) => {
                      const state: CheckState =
                        item.count === 0
                          ? 'neutral'
                          : item.key === 'system_admin'
                            ? 'warn'
                            : 'pass';
                      return (
                        <OperatorInsightCard
                          key={item.key}
                          label={item.label}
                          detail={`Filter directory to ${item.label.toLowerCase()}`}
                          badge={`${item.count.toLocaleString()} seats`}
                          count={item.count}
                          max={breakdownMax}
                          state={state}
                          icon={roleIcon(item.key)}
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
                  subtitle='Account hygiene signals'
                />
                <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
                  {buildUserAdvisories(overview, filtered).map((item) => (
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

                  {overview ? (
                    <div className='mt-1 rounded-xl border border-border bg-muted/20 px-3.5 py-3'>
                      <p className='text-[11px] font-semibold tracking-wide text-muted-foreground uppercase'>
                        Growth
                      </p>
                      <p className='mt-1 text-sm font-semibold text-foreground'>
                        {overview.users_7d.toLocaleString()} signups · 7d
                      </p>
                      <p className='text-xs text-muted-foreground'>
                        {overview.users_prev_7d.toLocaleString()} prior week
                      </p>
                    </div>
                  ) : null}
                </SurvaiPanelBody>
                <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                  <span className='font-mono text-[10px] uppercase tracking-wide'>
                    GET /admin/users
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

            {showCreate ? (
              <SurvaiPanel>
                <SurvaiPanelHeader
                  tone='soft'
                  icon={<Icons.user className='size-3.5' />}
                  title='Create user'
                  subtitle='Provisions login, role, and optional new workspace'
                />
                <SurvaiPanelBody>
                  <form
                    className='grid gap-4 sm:grid-cols-2'
                    onSubmit={(e) => {
                      e.preventDefault();
                      createMut.mutate();
                    }}
                  >
                    <div className='space-y-1.5'>
                      <Label htmlFor='admin-user-name'>Full name</Label>
                      <Input
                        id='admin-user-name'
                        required
                        value={form.full_name}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, full_name: e.target.value }))
                        }
                        className='h-10 rounded-xl'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='admin-user-email'>Email</Label>
                      <Input
                        id='admin-user-email'
                        type='email'
                        required
                        value={form.email}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, email: e.target.value }))
                        }
                        className='h-10 rounded-xl'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='admin-user-password'>Password</Label>
                      <Input
                        id='admin-user-password'
                        type='password'
                        required
                        minLength={8}
                        value={form.password}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, password: e.target.value }))
                        }
                        className='h-10 rounded-xl'
                      />
                    </div>
                    <div className='space-y-1.5'>
                      <Label htmlFor='admin-user-role'>Role</Label>
                      <select
                        id='admin-user-role'
                        value={form.role}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            role: e.target.value as AdminUser['role']
                          }))
                        }
                        className='h-10 w-full rounded-xl border border-border bg-card px-3 text-sm'
                      >
                        <option value='organization'>Owner</option>
                        <option value='researcher'>Researcher</option>
                        <option value='viewer'>Viewer</option>
                        <option value='system_admin'>System admin</option>
                      </select>
                    </div>
                    <div className='space-y-1.5 sm:col-span-2'>
                      <Label htmlFor='admin-user-org'>New organization (optional)</Label>
                      <Input
                        id='admin-user-org'
                        placeholder='Creates a workspace for owner role'
                        value={form.organization_name}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            organization_name: e.target.value
                          }))
                        }
                        className='h-10 rounded-xl'
                      />
                    </div>
                    <div className='flex flex-wrap gap-2 sm:col-span-2'>
                      <Button type='submit' disabled={createMut.isPending}>
                        {createMut.isPending ? 'Creating…' : 'Create user'}
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        onClick={() => {
                          setShowCreate(false);
                          setForm(EMPTY_FORM);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </SurvaiPanelBody>
              </SurvaiPanel>
            ) : null}

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.users className='size-3.5' />}
                title='User directory'
                subtitle='Search, filter by role, activate or deactivate'
              />
              <SurvaiPanelBody className='space-y-4'>
                <div className='flex flex-col gap-3'>
                  <FilterTabList
                    ariaLabel='Filter by role'
                    items={ROLE_TABS}
                    value={roleFilter}
                    onChange={setRoleFilter}
                  />
                  <div className='relative max-w-md'>
                    <Icons.search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
                    <Input
                      value={searchDraft}
                      onChange={(e) => {
                        setSearchDraft(e.target.value);
                        debouncedSetSearch(e.target.value);
                      }}
                      placeholder='Search name or email…'
                      className='h-10 rounded-xl border-border bg-card pl-9'
                    />
                  </div>
                </div>

                {isLoading ? (
                  <DataTableSkeleton columnCount={6} rowCount={10} withViewOptions={false} />
                ) : (
                  <DataTable
                    table={table}
                    rowNoun='users'
                    emptyTitle='No users found'
                    emptyDescription={
                      params.q || roleFilter !== 'all'
                        ? 'Try another search or role filter.'
                        : 'Create a user or wait for sign-ups.'
                    }
                    emptyIcon={<Icons.users className='size-5 text-foreground' />}
                  />
                )}

                {data ? (
                  <p className='text-center font-mono text-[11px] text-muted-foreground'>
                    Showing {data.users.length.toLocaleString()} of{' '}
                    {data.total.toLocaleString()}
                    {roleFilter !== 'all'
                      ? ` · ${adminUserRoleLabel(roleFilter as AdminUser['role'])}`
                      : ''}
                    {params.q ? ` · search “${params.q}”` : ''}
                  </p>
                ) : null}
              </SurvaiPanelBody>
            </SurvaiPanel>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.code className='size-3.5' />}
                title='Seat roles'
                subtitle='How accounts map to the product'
              />
              <SurvaiPanelBody>
                <div className='grid gap-4 md:grid-cols-3'>
                  {(
                    [
                      {
                        title: 'Owners',
                        body: 'Workspace billing and member management. Creating an owner can optionally provision a new organization.'
                      },
                      {
                        title: 'Researchers & viewers',
                        body: 'Collaborators inside a tenant with progressively narrower write access to surveys and reports.'
                      },
                      {
                        title: 'System admins',
                        body: 'Platform operators on this dashboard. Keep the set small — actions are mirrored in the activity log.'
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
        open={deactivateTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent className='sm:max-w-md'>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Deactivate {deactivateTarget?.full_name}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They cannot sign in until you activate the account again. Organization
              data is unchanged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggleActiveMut.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={toggleActiveMut.isPending}
              onClick={() => {
                if (!deactivateTarget) return;
                toggleActiveMut.mutate({
                  id: deactivateTarget.id,
                  is_active: false
                });
              }}
            >
              {toggleActiveMut.isPending ? 'Deactivating…' : 'Deactivate user'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageContainer>
  );
}
