'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';

import { Icons } from '@/components/icons';
import PageContainer from '@/components/layout/page-container';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelFooter,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { adminOverviewQueryOptions } from '@/features/admin/api/queries';
import type {
  AdminOverview,
  AdminOverviewBreakdownItem,
  AdminOverviewKpi
} from '@/features/admin/api/types';
import { cn } from '@/lib/utils';

import {
  AdminActivityChart,
  AdminActivityChartSkeleton
} from './overview/activity-chart';
import { relativeTime } from './overview/format';
import { UserPresenceMap } from './overview/user-presence-map';
import type { AdminOverviewGeoPresence } from '@/features/admin/api/types';

function TrendIcon({ trend }: { trend?: AdminOverviewKpi['trend'] }) {
  if (trend === 'down') return <Icons.trendingDown className='size-3' />;
  if (trend === 'flat') return <Icons.minus className='size-3' />;
  return <Icons.trendingUp className='size-3' />;
}

function KpiCard({ kpi }: { kpi: AdminOverviewKpi }) {
  const body = (
    <article
      className={cn(
        'h-full rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4 transition-colors duration-200',
        'hover:bg-brand-soft/80',
        kpi.href && 'cursor-pointer'
      )}
    >
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <p className='text-[12px] font-medium text-muted-foreground'>{kpi.label}</p>
          <p className='font-display text-3xl font-extrabold tracking-tight tabular-nums text-primary'>
            {kpi.value}
          </p>
          {kpi.hint ? (
            <p className='mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
              {kpi.hint}
            </p>
          ) : null}
        </div>
        {kpi.delta ? (
          <Badge
            variant='secondary'
            className='shrink-0 rounded-full border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground'
          >
            <TrendIcon trend={kpi.trend} />
            {kpi.delta}
          </Badge>
        ) : null}
      </div>
    </article>
  );

  if (kpi.href) {
    return (
      <Link href={kpi.href} className='block h-full'>
        {body}
      </Link>
    );
  }
  return body;
}

function KpiSkeleton() {
  return (
    <div className='rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4'>
      <Skeleton className='h-3 w-24' />
      <Skeleton className='mt-3 h-8 w-20' />
      <Skeleton className='mt-2 h-3 w-28' />
    </div>
  );
}

function BreakdownBars({
  title,
  subtitle,
  items,
  href,
  empty
}: {
  title: string;
  subtitle: string;
  items: AdminOverviewBreakdownItem[];
  href?: string;
  empty: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.count));
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader title={title} subtitle={subtitle} />
      <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
        {total === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>{empty}</p>
        ) : (
          items.map((item) => {
            const fill = Math.round((item.count / max) * 100);
            return (
              <div
                key={item.key}
                className='relative flex items-center gap-3 overflow-hidden rounded-xl border border-border bg-card px-3 py-2.5'
              >
                <div
                  className='pointer-events-none absolute inset-y-0 left-0 bg-brand/20'
                  style={{ width: `${fill}%` }}
                  aria-hidden
                />
                <div className='relative min-w-0 flex-1'>
                  <p className='text-sm font-semibold tracking-tight text-foreground'>
                    {item.label}
                  </p>
                </div>
                <span className='relative font-mono text-xs tabular-nums text-muted-foreground'>
                  {item.count.toLocaleString()}
                </span>
              </div>
            );
          })
        )}
      </SurvaiPanelBody>
      {href ? (
        <SurvaiPanelFooter>
          <Link
            href={href}
            className='inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'
          >
            View all
            <Icons.arrowRight className='size-3.5' />
          </Link>
        </SurvaiPanelFooter>
      ) : null}
    </SurvaiPanel>
  );
}



function RecentOrgs({ data }: { data: AdminOverview }) {
  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.workspace className='size-3.5' />}
        title='Recent organizations'
        subtitle='Newest workspaces on the platform'
      />
      <SurvaiPanelBody className='flex min-h-0 flex-col'>
        {data.recent_orgs.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            No organizations yet.
          </p>
        ) : (
          <ul
            className='scrollbar-thin scrollbar-gutter-stable max-h-64 list-none space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-72'
            aria-label='Recent organizations'
          >
            {data.recent_orgs.map((org) => (
              <li key={org.id}>
                <Link
                  href={`/admin/orgs/${org.id}`}
                  className='flex items-center gap-3 rounded-xl border border-border px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] hover:bg-brand-soft/40'
                >
                <div className='min-w-0 flex-1'>
                  <div className='flex items-center gap-2'>
                    <p className='truncate text-sm font-semibold text-foreground'>
                      {org.name}
                    </p>
                    {!org.is_active ? (
                      <Badge variant='destructive' className='rounded-full text-[10px]'>
                        Suspended
                      </Badge>
                    ) : null}
                  </div>
                  <p className='font-mono text-[10px] text-muted-foreground uppercase'>
                    {org.member_count} members · {org.survey_count} surveys ·{' '}
                    {relativeTime(org.created_at)}
                  </p>
                </div>
                <Icons.chevronRight className='size-4 text-muted-foreground' />
              </Link>
              </li>
            ))}
          </ul>
        )}
      </SurvaiPanelBody>
      <SurvaiPanelFooter>
        <Link
          href='/admin/orgs'
          className='inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'
        >
          All organizations
          <Icons.arrowRight className='size-3.5' />
        </Link>
      </SurvaiPanelFooter>
    </SurvaiPanel>
  );
}

function RecentAiFailures({ data }: { data: AdminOverview }) {
  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.sparkles className='size-3.5' />}
        title='Recent AI failures'
        subtitle={`${data.ai_errors_7d} failures in the last 7 days`}
      />
      <SurvaiPanelBody className='flex min-h-0 flex-col'>
        {data.recent_ai_failures.length === 0 ? (
          <p className='py-8 text-center text-sm text-muted-foreground'>
            No recent AI failures — generation calls are clean.
          </p>
        ) : (
          <div
            className='scrollbar-thin scrollbar-gutter-stable max-h-64 space-y-1.5 overflow-y-auto overscroll-contain pr-0.5 sm:max-h-72'
            role='list'
            aria-label='Recent AI failure events'
          >
            {data.recent_ai_failures.map((row) => (
              <div
                key={row.id}
                role='listitem'
                className='rounded-xl border border-destructive/25 bg-destructive/5 px-3 py-2.5'
              >
                <div className='flex items-start justify-between gap-3'>
                  <p className='text-sm font-semibold text-foreground'>
                    {row.feature} · {row.status}
                  </p>
                  <span className='shrink-0 font-mono text-[10px] text-muted-foreground'>
                    {relativeTime(row.created_at)}
                  </span>
                </div>
                <p className='mt-0.5 truncate text-xs text-muted-foreground'>
                  {row.user_email ?? 'unknown user'} · {row.model}
                  {row.latency_ms != null ? ` · ${row.latency_ms}ms` : ''}
                </p>
                {row.error_message ? (
                  <p className='mt-1 line-clamp-2 text-xs text-destructive/90'>
                    {row.error_message}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </SurvaiPanelBody>
      <SurvaiPanelFooter>
        <Link
          href='/admin/ai-logs'
          className='inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline'
        >
          AI usage
          <Icons.arrowRight className='size-3.5' />
        </Link>
      </SurvaiPanelFooter>
    </SurvaiPanel>
  );
}

function UserPresencePanel({ geo }: { geo: AdminOverviewGeoPresence }) {
  return (
    <SurvaiPanel className='flex h-full min-h-0 flex-col'>
      <SurvaiPanelHeader
        title='User presence'
        subtitle={
          geo.users_located > 0
            ? `${geo.users_located} users · ${geo.countries.length} countries highlighted`
            : 'Countries light up when users sign in'
        }
      />
      <SurvaiPanelBody className='flex min-h-0 flex-1 flex-col p-2 pt-2 sm:p-2'>
        <UserPresenceMap geo={geo} />
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function OverviewSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
        {Array.from({ length: 6 }).map((_, i) => (
          <KpiSkeleton key={i} />
        ))}
      </div>
      <div className='grid gap-4 xl:grid-cols-2'>
        <AdminActivityChartSkeleton />
        <SurvaiPanel className='flex h-full min-h-0 flex-col'>
          <SurvaiPanelHeader title='User presence' subtitle='Loading…' />
          <SurvaiPanelBody className='p-2'>
            <Skeleton className='min-h-[320px] w-full flex-1 rounded-lg' />
          </SurvaiPanelBody>
        </SurvaiPanel>
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery(
    adminOverviewQueryOptions()
  );

  return (
    <PageContainer
      pageTitle='Platform overview'
      pageDescription='Cross-organization health, growth, AI reliability, and admin actions.'
      pageHeaderAction={
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          <Icons.spinner className={cn('mr-1.5 size-3.5', isFetching && 'animate-spin')} />
          {isFetching ? 'Refreshing…' : 'Refresh'}
        </Button>
      }
    >
      {isLoading ? <OverviewSkeleton /> : null}

      {error ? (
        <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
          {error instanceof Error ? error.message : 'Failed to load platform overview'}
        </div>
      ) : null}

      {data ? (
        <div className='space-y-6'>
          <div className='grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'>
            {data.kpis.map((kpi) => (
              <KpiCard key={kpi.key || kpi.label} kpi={kpi} />
            ))}
          </div>

          <div className='grid items-stretch gap-4 xl:grid-cols-2'>
            <AdminActivityChart series={data.series_30d} />
            <UserPresencePanel
              geo={
                data.geo_presence ?? {
                  countries: [],
                  users_located: 0,
                  users_unknown: data.users_total
                }
              }
            />
          </div>

          <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
            <BreakdownBars
              title='Survey status'
              subtitle='All surveys across every org'
              items={data.survey_status}
              empty='No surveys created yet.'
            />
            <BreakdownBars
              title='Seat roles'
              subtitle='Platform-wide user role mix'
              items={data.user_roles}
              href='/admin/users'
              empty='No users yet.'
            />
            <BreakdownBars
              title='AI by feature (7d)'
              subtitle='Generation volume by product surface'
              items={data.ai_by_feature_7d}
              href='/admin/ai-logs'
              empty='No AI calls in the last 7 days.'
            />
          </div>

          <div className='grid gap-4 lg:grid-cols-2 xl:grid-cols-3'>
            <RecentOrgs data={data} />
            <div className='min-w-0 lg:col-span-2 xl:col-span-2'>
              <RecentAiFailures data={data} />
            </div>
          </div>
        </div>
      ) : null}
    </PageContainer>
  );
}
