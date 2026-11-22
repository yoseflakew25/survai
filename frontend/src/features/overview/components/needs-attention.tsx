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
import { useTranslations } from 'next-intl';
import Link from 'next/link';

function kindMeta(kind: string): {
  labelKey: 'staleReport' | 'readyForReport' | 'needsResponses' | 'draft' | 'planReady';
  icon: typeof Icons.warning;
  className: string;
} {
  if (kind === 'stale_report') {
    return {
      labelKey: 'staleReport',
      icon: Icons.warning,
      className: 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
    };
  }
  if (kind === 'ready_for_report') {
    return {
      labelKey: 'readyForReport',
      icon: Icons.report,
      className: 'bg-brand text-brand-foreground'
    };
  }
  if (kind === 'no_responses') {
    return {
      labelKey: 'needsResponses',
      icon: Icons.collect,
      className: 'bg-muted text-muted-foreground'
    };
  }
  if (kind === 'draft') {
    return {
      labelKey: 'draft',
      icon: Icons.review,
      className: 'bg-brand-soft text-primary'
    };
  }
  return {
    labelKey: 'planReady',
    icon: Icons.plan,
    className: 'bg-brand-soft text-primary'
  };
}

export function NeedsAttention() {
  const t = useTranslations('overview');
  const tCommon = useTranslations('common');
  const tSurveys = useTranslations('surveys');
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) {
    return (
      <SurvaiPanel className='flex h-full flex-col'>
        <SurvaiPanelHeader
          icon={<Icons.warning className='size-3.5' />}
          title={t('needsAttention')}
          subtitle={tCommon('loading')}
        />
        <SurvaiPanelBody className='space-y-2'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='h-16 rounded-none' />
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
          title={t('needsAttention')}
          subtitle={t('attentionLoadError')}
        />
        <SurvaiPanelBody>
          <p className='text-sm text-destructive'>{t('refreshRetry')}</p>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  const items = data.attention;

  return (
    <SurvaiPanel className='flex h-full flex-col'>
      <SurvaiPanelHeader
        title={t('needsAttention')}
        subtitle={
          items.length === 0
            ? t('attentionHealthy')
            : t('itemsToReview', { count: items.length })
        }
        badge={
          items.length > 0 ? (
            <span className='rounded-full border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand px-2 py-0.5 font-mono text-xs font-semibold tabular-nums text-brand-foreground'>
              {items.length}
            </span>
          ) : null
        }
      />
      <SurvaiPanelBody className='flex flex-1 flex-col gap-2'>
        {items.length === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center rounded-none border border-dashed border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft/40 px-4 py-10 text-center'>
            <span className='mb-3 flex size-11 items-center justify-center rounded-none bg-brand text-brand-foreground shadow-none'>
              <Icons.check className='size-5' strokeWidth={2.5} />
            </span>
            <p className='font-display text-sm font-bold tracking-tight text-foreground'>
              {t('allClearHeading')}
            </p>
            <p className='text-muted-foreground mt-1 max-w-[16rem] text-xs leading-relaxed'>
              {t('allClearBody')}
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
                className='group flex items-start gap-3 rounded-none border border-border bg-card px-3 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] hover:bg-brand-soft/50'
              >
                <span
                  className={cn(
                    ' flex size-8 shrink-0 items-center justify-center rounded-none',
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
                    <span className='text-muted-foreground shrink-0 rounded-full bg-muted/70 px-2 py-0.5 text-xs font-semibold'>
                      {meta.labelKey === 'draft'
                        ? tSurveys('statusDraft')
                        : t(meta.labelKey)}
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
