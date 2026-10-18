'use client';

import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

const chartData = [
  { month: 'January', desktop: 342, mobile: 245 },
  { month: 'February', desktop: 876, mobile: 654 },
  { month: 'March', desktop: 512, mobile: 387 },
  { month: 'April', desktop: 629, mobile: 521 },
  { month: 'May', desktop: 458, mobile: 412 },
  { month: 'June', desktop: 781, mobile: 598 },
  { month: 'July', desktop: 394, mobile: 312 },
  { month: 'August', desktop: 925, mobile: 743 },
  { month: 'September', desktop: 647, mobile: 489 },
  { month: 'October', desktop: 532, mobile: 476 },
  { month: 'November', desktop: 803, mobile: 687 },
  { month: 'December', desktop: 271, mobile: 198 }
];

const chartConfig = {
  desktop: {
    label: 'Completed',
    color: 'var(--chart-1)'
  },
  mobile: {
    label: 'Started',
    color: 'var(--chart-2)'
  }
} satisfies ChartConfig;

export function AreaGraph() {
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
        <ChartContainer config={chartConfig} className='aspect-auto h-[380px] w-full flex-1 min-h-[380px]'>
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
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <DottedBackgroundPattern config={chartConfig} />
            </defs>
            <Area
              dataKey='mobile'
              type='natural'
              fill='url(#dotted-background-pattern-mobile)'
              fillOpacity={0.45}
              stroke='var(--color-mobile)'
              stackId='a'
              strokeWidth={1.6}
            />
            <Area
              dataKey='desktop'
              type='natural'
              fill='url(#dotted-background-pattern-desktop)'
              fillOpacity={0.35}
              stroke='var(--color-desktop)'
              stackId='a'
              strokeWidth={1.6}
            />
          </AreaChart>
        </ChartContainer>
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
