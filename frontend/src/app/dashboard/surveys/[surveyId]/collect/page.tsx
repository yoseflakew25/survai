import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { surveyByIdOptions } from '@/features/builder/api/queries';
import { collectStatsOptions } from '@/features/collect/api/queries';
import { CollectView } from '@/features/collect/components/collect-view';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Collect'
};

export default async function CollectPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(surveyByIdOptions(surveyId));
  void queryClient.prefetchQuery(collectStatsOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<CollectPageSkeleton />}>
          <CollectView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function CollectPageSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Header + stepper row */}
      <div className='flex items-center justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-52 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <Skeleton className='h-14 w-2/3 rounded-lg' />
      </div>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <Skeleton className='h-72 w-full rounded-lg' />
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-40 w-full rounded-xl' />
          <Skeleton className='h-48 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}