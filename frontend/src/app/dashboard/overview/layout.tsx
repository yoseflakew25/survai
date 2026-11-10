import PageContainer from '@/components/layout/page-container';
import { LifecycleFunnel } from '@/features/overview/components/lifecycle-funnel';
import { NeedsAttention } from '@/features/overview/components/needs-attention';
import { OverviewKpis } from '@/features/overview/components/overview-kpis';
import React from 'react';

export default function OverViewLayout({
  surveys,
  area_stats
}: {
  surveys: React.ReactNode;
  area_stats: React.ReactNode;
}) {
  return (
    <PageContainer>
      <div className='flex flex-1 flex-col gap-6'>
        <OverviewKpis />

        <div className='grid grid-cols-1 items-stretch gap-4 md:grid-cols-2 lg:grid-cols-7'>
          <div className='col-span-4 flex min-h-[28rem] [&>*]:min-h-full [&>*]:w-full'>
            {area_stats}
          </div>
          <div className='col-span-4 flex min-h-[28rem] md:col-span-3 [&>*]:min-h-full [&>*]:w-full'>
            {surveys}
          </div>
        </div>

        <div className='grid grid-cols-1 items-stretch gap-4 lg:grid-cols-7'>
          <div className='flex min-h-[22rem] lg:col-span-4 [&>*]:min-h-full [&>*]:w-full'>
            <NeedsAttention />
          </div>
          <div className='flex min-h-[22rem] lg:col-span-3 [&>*]:min-h-full [&>*]:w-full'>
            <LifecycleFunnel />
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
