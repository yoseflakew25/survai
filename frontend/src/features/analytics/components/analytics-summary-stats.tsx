'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import type { AnalyticsSummary } from '../api/types';

interface AnalyticsSummaryStatsProps {
  summary: AnalyticsSummary;
}

export function AnalyticsSummaryStats({ summary }: AnalyticsSummaryStatsProps) {
  const stats = [
    {
      title: 'Total Responses',
      value: summary.responseCount.toLocaleString(),
      description: 'Collected responses',
      icon: Icons.user as React.ComponentType<{ className?: string }>,
      trend: '+12.5%',
      trendUp: true
    },
    {
      title: 'Completion Rate',
      value: `${summary.completionRate}%`,
      description: 'Finished the survey',
      icon: Icons.circleCheck as React.ComponentType<{ className?: string }>,
      trend: '+4.2%',
      trendUp: true
    },
    {
      title: 'Avg. Time',
      value: `${summary.avgCompletionMinutes} min`,
      description: 'To complete survey',
      icon: Icons.clock as React.ComponentType<{ className?: string }>,
      trend: '-1.3 min',
      trendUp: true
    },
    {
      title: 'Required Questions',
      value: '8',
      description: 'Out of 10 total',
      icon: Icons.forms as React.ComponentType<{ className?: string }>,
      trend: '',
      trendUp: true
    }
  ];

  return (
    <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className='pb-2'>
            <div className='flex items-center justify-between'>
              <CardDescription>{stat.description}</CardDescription>
              <stat.icon className='text-muted-foreground h-4 w-4' />
            </div>
            <CardTitle className='text-2xl font-semibold tabular-nums'>
              {stat.value}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-xs'>
                {stat.title}
              </span>
              {stat.trend && (
                <Badge variant='outline' className='text-[10px]'>
                  {stat.trendUp ? (
                    <Icons.trendingUp className='mr-0.5 h-2.5 w-2.5' />
                  ) : (
                    <Icons.trendingDown className='mr-0.5 h-2.5 w-2.5' />
                  )}
                  {stat.trend}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
