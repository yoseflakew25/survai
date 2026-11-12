'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

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
import { adminHealthQueryOptions } from '@/features/admin/api/queries';
import type { AdminHealth } from '@/features/admin/api/types';
import { cn } from '@/lib/utils';

type HealthLevel = 'operational' | 'attention' | 'critical';
type CheckState = 'pass' | 'warn' | 'fail' | 'neutral';

function isStatusOk(status: string) {
  const s = status.toLowerCase();
  return s === 'ok' || s === 'healthy' || s === 'up';
}

function healthLevel(data: AdminHealth): HealthLevel {
  if (!isStatusOk(data.status)) return 'critical';
  if (data.environment === 'production' && data.jobs_mode === 'inline') {
    return 'attention';
  }
  if (!data.redis_configured) return 'attention';
  return 'operational';
}

function levelHeadline(level: HealthLevel) {
  switch (level) {
    case 'operational':
      return 'All systems operational';
    case 'attention':
      return 'Operational with advisories';
    case 'critical':
      return 'Service needs attention';
  }
}

function levelSubtitle(level: HealthLevel) {
  switch (level) {
    case 'operational':
      return 'API is healthy and dependencies match expected production posture.';
    case 'attention':
      return 'Core API is up; review queue and cache configuration below.';
    case 'critical':
      return 'Health probe did not report a normal status — investigate the API process.';
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

function formatProbeTime(dataUpdatedAt: number) {
  const d = new Date(dataUpdatedAt);
  const seconds = Math.round((Date.now() - dataUpdatedAt) / 1000);
  if (seconds < 15) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function HealthHeroMetaChips({
  data,
  probedAt,
  className
}: {
  data: AdminHealth;
  probedAt: string;
  className?: string;
}) {
  const chips = [
    { label: 'Probe', value: probedAt },
    { label: 'Env', value: data.environment, className: 'uppercase' },
    { label: 'Jobs', value: data.jobs_mode, className: 'capitalize' },
    {
      label: 'Redis',
      value: data.redis_configured ? 'Ready' : 'Off',
      warn: !data.redis_configured
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
              'font-mono text-[11px] font-semibold tabular-nums text-brand-foreground',
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

function HealthHero({
  data,
  level,
  probedAt,
  headerAction
}: {
  data: AdminHealth;
  level: HealthLevel;
  probedAt: string;
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
              <div className='flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5'>
               
                <span
                  className='hidden h-3 w-px bg-brand-foreground/25 sm:inline'
                  aria-hidden
                />
                <h2 className='font-display text-lg font-extrabold tracking-tight text-brand-foreground sm:text-xl xl:text-2xl'>
                  {levelHeadline(level)}
                </h2>
              </div>
              <p className='mt-1 line-clamp-2 text-sm text-brand-foreground/80 md:max-w-xl xl:max-w-2xl'>
                {levelSubtitle(level)}
              </p>
            </div>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2 sm:gap-2.5 md:shrink-0'>
            <HealthHeroMetaChips
              data={data}
              probedAt={probedAt}
              className='justify-end'
            />
            {headerAction}
          </div>
        </div>
      </div>

      <div className='grid grid-cols-2 gap-px bg-[color-mix(in_srgb,var(--brand)_25%,var(--border))] lg:grid-cols-4'>
        {(
          [
            ['API', data.status.toUpperCase(), 'Liveness probe'],
            ['Queue', data.jobs_mode, data.jobs_mode === 'queue' ? 'Worker-backed' : 'In-process'],
            [
              'Redis',
              data.redis_configured ? 'Ready' : 'Off',
              data.redis_configured ? 'URL configured' : 'Not set'
            ],
            ['Posture', level === 'operational' ? 'Good' : level === 'attention' ? 'Review' : 'Alert', 'Config fit']
          ] as const
        ).map(([label, value, hint]) => (
          <div
            key={label}
            className='bg-card px-4 py-3.5 sm:px-5'
          >
            <p className='text-[11px] font-medium text-muted-foreground'>{label}</p>
            <p className='font-display text-2xl font-extrabold tracking-tight text-primary tabular-nums'>
              {value}
            </p>
            <p className='mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
              {hint}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ServiceCheckCard({
  title,
  description,
  value,
  state,
  icon
}: {
  title: string;
  description: string;
  value: string;
  state: CheckState;
  icon: ReactNode;
}) {
  const fill =
    state === 'pass' ? 100 : state === 'warn' ? 72 : state === 'fail' ? 28 : 50;

  return (
    <article className='flex h-full flex-col rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex size-10 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card text-primary shadow-sm'>
          {icon}
        </div>
        <Badge
          variant='outline'
          className={cn('rounded-full text-[10px] font-semibold capitalize', badgeClass(state))}
        >
          {value}
        </Badge>
      </div>
      <h3 className='mt-3 text-sm font-semibold tracking-tight text-foreground'>
        {title}
      </h3>
      <p className='mt-1 flex-1 text-xs leading-relaxed text-muted-foreground'>
        {description}
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

type Advisory = {
  id: string;
  severity: 'warning' | 'info';
  title: string;
  detail: string;
};

function buildAdvisories(data: AdminHealth): Advisory[] {
  const list: Advisory[] = [];
  if (data.environment === 'production' && data.jobs_mode === 'inline') {
    list.push({
      id: 'jobs-inline',
      severity: 'warning',
      title: 'Jobs running inline',
      detail:
        'Background work executes in the API process. For scale, point REDIS_URL at a queue and run ARQ workers.'
    });
  }
  if (!data.redis_configured) {
    list.push({
      id: 'redis-missing',
      severity: 'info',
      title: 'Redis not configured',
      detail:
        'Job queue and cross-request cache stay process-local. Safe for dev; add Redis when you need durable workers.'
    });
  }
  if (data.jobs_mode === 'queue' && data.redis_configured) {
    list.push({
      id: 'queue-ready',
      severity: 'info',
      title: 'Queue mode enabled',
      detail:
        'Workers should be running separately. Confirm ARQ processes are healthy if jobs appear stuck.'
    });
  }
  if (list.length === 0) {
    list.push({
      id: 'all-clear',
      severity: 'info',
      title: 'No configuration advisories',
      detail:
        'Environment, queue, and Redis line up with a typical production setup. Re-run refresh after deploys.'
    });
  }
  return list;
}

function checksFromHealth(data: AdminHealth) {
  const apiState: CheckState = isStatusOk(data.status) ? 'pass' : 'fail';
  const jobsState: CheckState =
    data.jobs_mode === 'queue'
      ? 'pass'
      : data.environment === 'production'
        ? 'warn'
        : 'neutral';
  const redisState: CheckState = data.redis_configured
    ? 'pass'
    : data.environment === 'production'
      ? 'warn'
      : 'neutral';
  const envState: CheckState =
    data.environment === 'production' || data.environment === 'staging'
      ? 'pass'
      : 'neutral';

  return [
    {
      title: 'HTTP API',
      description:
        'Admin health mirrors the public liveness endpoint. Uptime probes should see the same status.',
      value: data.status,
      state: apiState,
      icon: <Icons.activity className='size-4' />
    },
    {
      title: 'Background jobs',
      description:
        data.jobs_mode === 'queue'
          ? 'Work is dispatched to ARQ when Redis is reachable.'
          : 'Jobs run synchronously in the API — fine locally, risky at high load in production.',
      value: data.jobs_mode,
      state: jobsState,
      icon: <Icons.settings className='size-4' />
    },
    {
      title: 'Redis / queue',
      description: data.redis_configured
        ? 'REDIS_URL is set; queue mode can activate when workers are running.'
        : 'No Redis URL — inline mode only; overview cache is per-process.',
      value: data.redis_configured ? 'Configured' : 'Not set',
      state: redisState,
      icon: <Icons.collect className='size-4' />
    },
    {
      title: 'Runtime environment',
      description:
        'Drives stricter advisories in production (inline jobs, missing Redis).',
      value: data.environment,
      state: envState,
      icon: <Icons.laptop className='size-4' />
    }
  ] as const;
}

function HealthSkeleton() {
  return (
    <div className='space-y-6'>
      <Skeleton className='h-52 w-full rounded-[1.125rem]' />
      <div className='grid gap-3 sm:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-40 rounded-[1.125rem]' />
        ))}
      </div>
      <Skeleton className='h-48 w-full rounded-[1.125rem]' />
    </div>
  );
}

export default function AdminHealthPage() {
  const { data, isLoading, error, refetch, isFetching, dataUpdatedAt } = useQuery(
    adminHealthQueryOptions()
  );

  const refreshButton = (
    <Button
      type='button'
      variant='outline'
      size='sm'
      onClick={() => void refetch()}
      disabled={isFetching}
      className='h-9 rounded-xl border-[color-mix(in_srgb,var(--brand-foreground)_22%,transparent)] bg-card text-primary hover:bg-[color-mix(in_srgb,var(--card)_88%,white)]'
    >
      <Icons.spinner
        className={cn('mr-1.5 size-3.5', isFetching && 'animate-spin')}
      />
      {isFetching ? 'Refreshing…' : 'Refresh probe'}
    </Button>
  );

  const probedAt =
    dataUpdatedAt > 0 ? formatProbeTime(dataUpdatedAt) : 'Not yet probed';

  return (
    <PageContainer
      pageTitle='System health'
      pageDescription='API liveness, job execution mode, and Redis readiness for platform operators.'
    >
      <div className='space-y-6'>
        {error ? (
          <div className='rounded-[1.125rem] border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load health'}
          </div>
        ) : null}

        {isLoading ? (
          <HealthSkeleton />
        ) : data ? (
          <>
            <HealthHero
              data={data}
              level={healthLevel(data)}
              probedAt={probedAt}
              headerAction={refreshButton}
            />

            <div className='grid gap-4 xl:grid-cols-[1.2fr_0.8fr]'>
              <section className='space-y-3'>
                <div>
                  <h2 className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                    Service checks
                  </h2>
                  <p className='text-xs text-muted-foreground'>
                    Each probe reflects the current admin health payload — not deep dependency tests.
                  </p>
                </div>
                <div className='grid gap-3 sm:grid-cols-2'>
                  {checksFromHealth(data).map((check) => (
                    <ServiceCheckCard key={check.title} {...check} />
                  ))}
                </div>
              </section>

              <SurvaiPanel className='flex h-full flex-col'>
                <SurvaiPanelHeader
                  tone='soft'
                  icon={<Icons.warning className='size-3.5' />}
                  title='Operator advisories'
                  subtitle='Same signals as Platform overview alerts'
                />
                <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
                  {buildAdvisories(data).map((item) => (
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
                </SurvaiPanelBody>
                <SurvaiPanelFooter className='flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground'>
                  <span className='font-mono text-[10px] uppercase tracking-wide'>
                    GET /admin/health
                  </span>
                  <Link
                    href='/admin/overview'
                    className='inline-flex items-center gap-1 font-semibold text-primary hover:underline'
                  >
                    Back to overview
                    <Icons.chevronRight className='size-3' />
                  </Link>
                </SurvaiPanelFooter>
              </SurvaiPanel>
            </div>

            <SurvaiPanel>
              <SurvaiPanelHeader
                tone='soft'
                icon={<Icons.code className='size-3.5' />}
                title='What we measure'
                subtitle='Lightweight signals — not a full observability stack'
              />
              <SurvaiPanelBody>
                <div className='grid gap-4 md:grid-cols-3'>
                  {(
                    [
                      {
                        title: 'Liveness',
                        body: 'Confirms the admin API can respond. Public monitors should target /api/v1/health for the same process.'
                      },
                      {
                        title: 'Job mode',
                        body: 'Queue mode needs Redis + workers. Inline mode keeps the API self-contained but blocks on heavy tasks.'
                      },
                      {
                        title: 'Configuration',
                        body: 'Environment and REDIS_URL drive warnings on the overview dashboard and in the advisories panel.'
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
        ) : null}
      </div>
    </PageContainer>
  );
}
