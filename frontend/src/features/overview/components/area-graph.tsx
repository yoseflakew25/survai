'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';
import { useQuery } from '@tanstack/react-query';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { useTranslations } from 'next-intl';
import { overviewQueryOptions } from '@/features/overview/api/queries';
import { AreaGraphSkeleton } from './area-graph-skeleton';

const chartColors = {
  completed: 'var(--chart-1)',
  started: 'var(--chart-2)'
} as const;

export function AreaGraph() {
  const t = useTranslations('overview');
  const chartConfig = {
    completed: {
      label: t('completed'),
      color: chartColors.completed
    },
    started: {
      label: t('started'),
      color: chartColors.started
    }
  } satisfies ChartConfig;
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) return <AreaGraphSkeleton />;

  if (isError || !data) {
    return (
      <Card className='flex h-full flex-col rounded-none border border-destructive/30 bg-card p-5'>
        <CardTitle className='font-display text-xl font-extrabold'>{t('responseActivity')}</CardTitle>
        <CardDescription className='mt-2 text-destructive'>
          {t('activityLoadError')}
        </CardDescription>
      </Card>
    );
  }

  const chartData = data.activity.map((p) => ({
    month: p.label,
    completed: p.completed,
    started: p.started
  }));
  const hasAny = chartData.some((p) => p.started > 0 || p.completed > 0);

  return (
    <Card className='flex h-full flex-col gap-0 rounded-none border border-border bg-card py-0 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent),0_6px_20px_-16px_color-mix(in_srgb,var(--foreground)_14%,transparent)]'>
      <CardHeader className='border-b border-border bg-brand-soft px-5 py-4 sm:px-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='font-display text-xl font-extrabold tracking-tight'>
              {t('responseActivity')}
            </CardTitle>
            <CardDescription className=''>
              {t('activitySubtitle')}
            </CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs font-medium text-muted-foreground'>
              <span
                className='size-2 rounded-full bg-[var(--chart-1)]'
                aria-hidden='true'
              />
              {t('completed')}
            </span>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 font-mono text-xs font-medium text-muted-foreground'>
              <span
                className='size-2 rounded-full bg-[var(--chart-2)]'
                aria-hidden='true'
              />
              {t('started')}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col px-2 pt-5 pb-5 sm:px-4 sm:pb-6'>
        {!hasAny ? (
          <div className='flex flex-1 items-center justify-center rounded-none border border-dashed border-border bg-muted/20 px-4 py-16 text-center'>
            <div>
              <p className='text-sm font-medium text-foreground'>{t('noResponses')}</p>
              <p className='text-muted-foreground  max-w-sm text-xs leading-relaxed'>
                {t('noResponsesHint')}
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='aspect-auto h-[380px] w-full min-h-[380px] flex-1'
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 8, right: 8, top: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='month'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <defs>
                <DottedBackgroundPattern config={chartConfig} />
              </defs>
              <Area
                dataKey='started'
                type='natural'
                fill='url(#dotted-background-pattern-started)'
                fillOpacity={0.45}
                stroke='var(--color-started)'
                stackId='a'
                strokeWidth={1.6}
              />
              <Area
                dataKey='completed'
                type='natural'
                fill='url(#dotted-background-pattern-completed)'
                fillOpacity={0.35}
                stroke='var(--color-completed)'
                stackId='a'
                strokeWidth={1.6}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}

const DottedBackgroundPattern = ({ config }: { config: ChartConfig }) => {
  const items = Object.fromEntries(
    Object.entries(config).map(([key, value]) => [key, value.color])
  );
  return (
    <>
      {Object.entries(items).map(([key, value]) => (
        <pattern
          key={key}
          id={`dotted-background-pattern-${key}`}
          x='0'
          y='0'
          width='7'
          height='7'
          patternUnits='userSpaceOnUse'
        >
          <circle cx='5' cy='5' r='1.5' fill={value} opacity={0.5}></circle>
        </pattern>
      ))}
    </>
  );
};
