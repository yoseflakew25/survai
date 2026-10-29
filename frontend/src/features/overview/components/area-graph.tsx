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
import { overviewQueryOptions } from '@/features/overview/api/queries';
import { AreaGraphSkeleton } from './area-graph-skeleton';

const chartConfig = {
  completed: {
    label: 'Completed',
    color: 'var(--chart-1)'
  },
  started: {
    label: 'Started',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function AreaGraph() {
  const { data, isLoading, isError } = useQuery(overviewQueryOptions());

  if (isLoading) return <AreaGraphSkeleton />;

  if (isError || !data) {
    return (
      <Card className='flex h-full flex-col rounded-2xl border border-destructive/30 bg-card p-5'>
        <CardTitle className='font-display text-lg font-extrabold'>Response activity</CardTitle>
        <CardDescription className='mt-2 text-destructive'>
          Could not load response activity. Refresh and try again.
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
    <Card className='flex h-full flex-col gap-0 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card py-0'>
      <CardHeader className='border-b border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-muted/25 px-5 py-4 sm:px-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='font-display text-lg font-extrabold tracking-tight'>
              Response activity
            </CardTitle>
            <CardDescription className='mt-0.5'>
              Completed vs started over the last 12 months
            </CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--brand)_30%,var(--border))] bg-card px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground'>
              <span
                className='size-2 rounded-full bg-[var(--chart-1)]'
                aria-hidden='true'
              />
              Completed
            </span>
            <span className='inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground'>
              <span
                className='size-2 rounded-full bg-[var(--chart-2)]'
                aria-hidden='true'
              />
              Started
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col px-2 pt-5 pb-5 sm:px-4 sm:pb-6'>
        {!hasAny ? (
          <div className='flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-16 text-center'>
            <div>
              <p className='text-sm font-medium text-foreground'>No responses yet</p>
              <p className='text-muted-foreground mt-1 max-w-sm text-xs leading-relaxed'>
                Publish a survey and collect submissions — this chart fills with
                real started vs completed activity.
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
