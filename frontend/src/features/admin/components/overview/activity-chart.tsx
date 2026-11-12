'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import type { AdminOverviewSeriesPoint } from '@/features/admin/api/types';

const chartConfig = {
  responses_completed: {
    label: 'Completed',
    color: 'var(--chart-1)'
  },
  responses_started: {
    label: 'Started',
    color: 'var(--chart-2)'
  },
  ai_calls: {
    label: 'AI calls',
    color: 'var(--chart-3)'
  }
} satisfies ChartConfig;

export function AdminActivityChartSkeleton() {
  return (
    <Card className='flex h-full flex-col rounded-[1.125rem] border border-border bg-card py-0'>
      <CardHeader className='border-b border-border bg-brand-soft px-5 py-4'>
        <Skeleton className='h-6 w-48' />
        <Skeleton className='mt-2 h-4 w-64' />
      </CardHeader>
      <CardContent className='px-4 py-5'>
        <Skeleton className='h-[320px] w-full rounded-xl' />
      </CardContent>
    </Card>
  );
}

export function AdminActivityChart({ series }: { series: AdminOverviewSeriesPoint[] }) {
  const chartData = series.map((p) => ({
    label: p.label,
    responses_completed: p.responses_completed,
    responses_started: p.responses_started,
    ai_calls: p.ai_calls
  }));
  const hasAny = chartData.some(
    (p) => p.responses_started > 0 || p.responses_completed > 0 || p.ai_calls > 0
  );

  return (
    <Card className='flex h-full flex-col gap-0 rounded-[1.125rem] border border-border bg-card py-0 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent),0_6px_20px_-16px_color-mix(in_srgb,var(--foreground)_14%,transparent)]'>
      <CardHeader className='border-b border-border bg-brand-soft px-5 py-4 sm:px-6'>
        <div className='flex flex-wrap items-start justify-between gap-3'>
          <div>
            <CardTitle className='font-display text-xl font-extrabold tracking-tight'>
              Platform activity
            </CardTitle>
            <CardDescription>
              Responses and AI calls across all organizations · last 30 days
            </CardDescription>
          </div>
          <div className='flex flex-wrap gap-2'>
            {(
              [
                ['Completed', '--chart-1'],
                ['Started', '--chart-2'],
                ['AI calls', '--chart-3']
              ] as const
            ).map(([label, token]) => (
              <span
                key={label}
                className='inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 font-mono text-[10px] font-medium text-muted-foreground'
              >
                <span
                  className='size-2 rounded-full'
                  style={{ background: `var(${token})` }}
                  aria-hidden
                />
                {label}
              </span>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex flex-1 flex-col px-2 pt-5 pb-5 sm:px-4 sm:pb-6'>
        {!hasAny ? (
          <div className='flex flex-1 items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 px-4 py-16 text-center'>
            <div>
              <p className='text-sm font-medium text-foreground'>No platform activity yet</p>
              <p className='mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground'>
                Completed responses, starts, and AI generation calls will plot here as
                orgs use the product.
              </p>
            </div>
          </div>
        ) : (
          <ChartContainer
            config={chartConfig}
            className='aspect-auto h-[320px] w-full min-h-[320px] flex-1'
          >
            <AreaChart
              accessibilityLayer
              data={chartData}
              margin={{ left: 4, right: 8, top: 8 }}
            >
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='label'
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                interval='preserveStartEnd'
                minTickGap={28}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={36}
                allowDecimals={false}
              />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <Area
                dataKey='responses_started'
                type='monotone'
                fill='var(--color-responses_started)'
                fillOpacity={0.18}
                stroke='var(--color-responses_started)'
                strokeWidth={1.5}
              />
              <Area
                dataKey='responses_completed'
                type='monotone'
                fill='var(--color-responses_completed)'
                fillOpacity={0.28}
                stroke='var(--color-responses_completed)'
                strokeWidth={1.8}
              />
              <Area
                dataKey='ai_calls'
                type='monotone'
                fill='var(--color-ai_calls)'
                fillOpacity={0.12}
                stroke='var(--color-ai_calls)'
                strokeWidth={1.5}
                strokeDasharray='4 3'
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
