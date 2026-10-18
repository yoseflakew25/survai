import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import React from 'react';
import { cn } from '@/lib/utils';

const KPI_CARDS = [
  {
    label: 'Total Surveys',
    value: '12',
    delta: '+3 this month',
    hint: 'Live workspace'
  },
  {
    label: 'Total Responses',
    value: '1,847',
    delta: '+12.5%',
    hint: 'All versions'
  },
  {
    label: 'Reports Generated',
    value: '8',
    delta: '+2 this week',
    hint: 'Exports'
  },
  {
    label: 'Completion Rate',
    value: '78.3%',
    delta: '+4.2%',
    hint: 'Completed / started'
  }
] as const;

export default function OverViewLayout({
  surveys,
  pie_stats: _pie_stats,
  bar_stats: _bar_stats,
  area_stats
}: {
  surveys: React.ReactNode;
  pie_stats: React.ReactNode;
  bar_stats: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-5'>
        <header className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft/70 px-5 py-5 sm:px-6 sm:py-6'>
          {/* Mid-panel line grid — peaking in the center, soft edges */}
          <div
            className='pointer-events-none absolute inset-0 opacity-[0.55]'
            style={{
              backgroundImage: `
                linear-gradient(to right, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px),
                linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px)
              `,
              backgroundSize: '22px 22px',
              maskImage:
                'radial-gradient(ellipse 70% 85% at 55% 50%, black 0%, black 35%, transparent 72%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 70% 85% at 55% 50%, black 0%, black 35%, transparent 72%)'
            }}
            aria-hidden='true'
          />
          {/* Soft brand glow behind the grid mid-band */}
          <div
            className='pointer-events-none absolute inset-y-0 left-1/3 right-1/4 opacity-50'
            style={{
              background:
                'radial-gradient(ellipse 80% 70% at 50% 50%, color-mix(in srgb, var(--brand) 35%, transparent), transparent 70%)'
            }}
            aria-hidden='true'
          />
          <div className='relative flex flex-wrap items-end justify-between gap-4'>
            <div className='max-w-xl'>
              <h1 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.75rem]'>
                Welcome to Survai
              </h1>
              <p className='text-sm leading-relaxed text-muted-foreground'>
                Survey activity and performance — figures from your data, never
                invented.
              </p>
            </div>
            <div className='inline-flex items-center gap-2 rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-card px-3 py-1.5 font-mono text-[11px] text-muted-foreground'>
              <span className='text-foreground font-semibold'>Plan → Report</span>
              grounded analytics
            </div>
          </div>
        </header>

        <div className='grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4'>
          {KPI_CARDS.map((kpi) => (
            <article
              key={kpi.label}
              className={cn(
                'group relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card p-4 transition-colors duration-200',
                'hover:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] hover:bg-brand-soft/50'
              )}
            >
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <p className='text-[12px] font-medium text-muted-foreground'>
                    {kpi.label}
                  </p>
                  <p className='font-display mt-1.5 text-3xl font-extrabold tracking-tight tabular-nums text-foreground'>
                    {kpi.value}
                  </p>
                  <p className='mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
                    {kpi.hint}
                  </p>
                </div>
                <Badge
                  variant='secondary'
                  className='shrink-0 rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-2 py-0.5 text-[10px] font-semibold text-foreground'
                >
                  <Icons.trendingUp className='size-3' />
                  {kpi.delta}
                </Badge>
              </div>
            </article>
          ))}
        </div>

        <div className='grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4 flex min-h-[28rem] [&>*]:min-h-full [&>*]:w-full'>
            {area_stats}
          </div>
          <div className='col-span-4 flex min-h-[28rem] md:col-span-3 [&>*]:min-h-full [&>*]:w-full'>
            {surveys}
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
