'use client';

import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { Icon } from '@/components/icons';
import type { AnalyticsSummary } from '../api/types';

interface AnalyticsSummaryStatsProps {
  summary: AnalyticsSummary;
}

interface Stat {
  title: string;
  value: string;
  description: string;
  icon: Icon;
  trend: string;
  trendUp: boolean;
}

export function AnalyticsSummaryStats({ summary }: AnalyticsSummaryStatsProps) {
  const stats: Stat[] = [
    {
      title: 'Total Responses',
      value: summary.responseCount.toLocaleString(),
      description: 'Collected responses',
      icon: 'user' as const,
      trend: '+12.5%',
      trendUp: true
    },
    {
      title: 'Completion Rate',
      value: `${summary.completionRate}%`,
      description: 'Finished the survey',
      icon: 'circleCheck' as const,
      trend: '+4.2%',
      trendUp: true
    },
    {
      title: 'Avg. Time',
      value: `${summary.avgCompletionMinutes} min`,
      description: 'To complete survey',
      icon: 'clock' as const,
      trend: '-1.3 min',
      trendUp: false
    },
    {
      title: 'Required Questions',
      value: '8',
      description: 'Out of 10 total',
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
          <div key={stat.title} className='rounded-lg bg-muted/40 p-3'>
            <div className='flex items-center justify-between gap-2'>
              <p className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                {stat.title}
              </p>
              {IconComponent && (
                <IconComponent className='text-primary h-4 w-4 shrink-0' />
              )}
            </div>
          <div className='mt-1 flex items-center justify-between gap-2'>
            <p className='text-xl font-semibold tabular-nums'>{stat.value}</p>
            {stat.trend && (
              <Badge variant='outline' className='text-[10px]'>
                {stat.trendUp ? (
                  <Icons.trendingUp className='h-2.5 w-2.5' />
                ) : (
                  <Icons.trendingDown className='h-2.5 w-2.5' />
                )}
                {stat.trend}
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-xs'>{stat.description}</p>
          </div>
        );
      })}
    </div>
  );
}
