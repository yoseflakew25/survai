import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { reportOptions } from '@/features/reports/api/queries';
import { ReportView } from '@/features/reports/components/report-view';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Report | Survey Copilot'
};

export default async function ReportsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(reportOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<ReportsPageSkeleton />}>
          <ReportView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function ReportsPageSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Header + stepper row */}
      <div className='grid items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)]'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-52 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <Skeleton className='h-14 w-full rounded-lg' />
      </div>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <Skeleton className='h-28 w-full rounded-lg' />
          <Skeleton className='h-40 w-full rounded-lg' />
          <Skeleton className='h-40 w-full rounded-lg' />
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-40 w-full rounded-xl' />
          <Skeleton className='h-64 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}