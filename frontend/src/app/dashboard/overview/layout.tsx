import PageContainer from '@/components/layout/page-container';
import { OverviewKpis } from '@/features/overview/components/overview-kpis';
import React from 'react';

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
      <div className='flex flex-1 flex-col gap-6'>
        <header className='flex flex-wrap items-end justify-between gap-3'>
          <div className='max-w-xl'>
            <h1 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.75rem]'>
              Welcome to Survai
            </h1>
            <p className='text-muted-foreground  text-sm leading-relaxed'>
              Survey activity and performance — figures from your data, never
              invented.
            </p>
          </div>
          <p className='font-mono text-[11px] text-muted-foreground'>
            <span className='font-semibold text-foreground'>Plan → Report</span>
            {' · '}
            grounded analytics
          </p>
        </header>

        <OverviewKpis />

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
