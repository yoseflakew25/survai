'use client';

import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { Icon } from '@/components/icons';
import type { AnalyticsSummary } from '../api/types';

interface AnalyticsSummaryStatsProps {
  summary: AnalyticsSummary;
}

interface Stat {
  id: string;
  title: string;
  value: string;
  description: string;
  icon: Icon;
  trend: string;
  trendUp: boolean;
}

export function AnalyticsSummaryStats({ summary }: AnalyticsSummaryStatsProps) {
  const t = useTranslations('analytics');
  const started =
    summary.metrics.find((m) => m.key === 'started_count')?.value ?? null;
  const median =
    summary.metrics.find((m) => m.key === 'median_time')?.value ?? null;

  const stats: Stat[] = [
    {
      id: 'total',
      title: t('totalResponses'),
      value: summary.responseCount.toLocaleString(),
      description: t('completedResponses'),
      icon: 'user' as const,
      trend: '',
      trendUp: true
    },
    {
      id: 'completion',
      title: t('completionRate'),
      value: `${summary.completionRate}%`,
      description:
        started != null
          ? t('startedThisVersion', { count: started })
          : t('finishedVsStarted'),
      icon: 'circleCheck' as const,
      trend: '',
      trendUp: true
    },
    {
      id: 'avg',
      title: t('avgTime'),
      value:
        summary.avgCompletionMinutes > 0
          ? t('minutes', { count: summary.avgCompletionMinutes })
          : '—',
      description: t('toComplete'),
      icon: 'clock' as const,
      trend: '',
      trendUp: true
    },
    {
      id: 'median',
      title: t('medianTime'),
      value:
        median != null && median !== '' ? t('minutes', { count: median }) : '—',
      description: t('middleTime'),
      icon: 'forms' as const,
      trend: '',
      trendUp: true
    }
  ];

  return (
    <div className='grid grid-cols-2 gap-3 xl:grid-cols-4'>
      {stats.map((stat) => {
        const IconComponent = Icons[stat.icon];

        return (
          <div
            key={stat.id}
            className='rounded-xl border border-border bg-muted/40 p-3'
          >
            <div className='flex items-center justify-between gap-2'>
              <p className='text-muted-foreground text-xs font-medium tracking-wide uppercase'>
                {stat.title}
              </p>
              {IconComponent ? (
                <IconComponent className='size-4 shrink-0 text-foreground' />
              ) : null}
            </div>
            <div className=' flex items-center justify-between gap-2'>
              <p className='font-display text-xl font-extrabold tracking-tight tabular-nums'>
                {stat.value}
              </p>
              {stat.trend ? (
                <Badge
                  variant='outline'
                  className='rounded-full border-transparent bg-muted text-xs text-muted-foreground'
                >
                  {stat.trendUp ? (
                    <Icons.trendingUp className='h-2.5 w-2.5' />
                  ) : (
                    <Icons.trendingDown className='h-2.5 w-2.5' />
                  )}
                  {stat.trend}
                </Badge>
              ) : null}
            </div>
            <p className='text-muted-foreground  text-xs'>{stat.description}</p>
          </div>
        );
      })}
    </div>
  );
}
