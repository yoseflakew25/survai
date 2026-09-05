import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { respondentsOptions } from '@/features/respondents/api/queries';
import { RespondentsView } from '@/features/respondents/components/respondents-view';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Respondents | Survey Copilot'
};

export default async function RespondentsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  // Match the client's default URL params (page=1, perPage=10) so the
  // prefetched query is hydrated on first paint.
  void queryClient.prefetchQuery(respondentsOptions(surveyId, { page: 1, limit: 10 }));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<RespondentsPageSkeleton />}>
          <RespondentsView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function RespondentsPageSkeleton() {
  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Header + stats in one row */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-44 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <div className='grid flex-1 basis-[32rem] grid-cols-2 gap-3 sm:grid-cols-4'>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className='flex h-[4.25rem] w-full items-center gap-3 rounded-lg border bg-muted/40 p-3'>
              <Skeleton className='size-9 shrink-0 rounded-md' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-2.5 w-16 rounded' />
                <Skeleton className='h-4 w-10 rounded' />
              </div>
            </Skeleton>
          ))}
        </div>
      </div>

      {/* Toolbar row */}
      <div className='flex items-center gap-2 px-1 py-1'>
        <Skeleton className='h-8 w-56 rounded-md' />
        <Skeleton className='h-8 w-24 rounded-md' />
        <Skeleton className='ml-auto h-8 w-20 rounded-md' />
      </div>

      {/* Table card */}
      <div className='overflow-hidden rounded-lg border bg-background'>
        {/* Table header */}
        <div className='flex gap-16 border-b bg-muted/50 px-4 py-3'>
          <Skeleton className='h-3 w-32 rounded' />
          <Skeleton className='h-3 w-16 rounded' />
          <Skeleton className='h-3 w-28 rounded' />
          <Skeleton className='h-3 w-20 rounded' />
        </div>

        {/* Rows */}
        <div className='divide-y'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className='flex items-center gap-3 px-4 py-3'>
              <Skeleton className='size-8 shrink-0 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-48 rounded' />
                <Skeleton className='h-3 w-64 rounded' />
              </div>
              <Skeleton className='h-5 w-20 rounded-full' />
              <Skeleton className='h-3 w-32 rounded' />
              <Skeleton className='h-3 w-14 rounded' />
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className='flex items-center justify-between border-t px-4 py-2'>
          <Skeleton className='h-5 w-40 rounded' />
          <div className='flex items-center gap-4'>
            <Skeleton className='h-7 w-24 rounded-md' />
            <Skeleton className='h-5 w-12 rounded' />
            <Skeleton className='size-7 rounded-md' />
            <Skeleton className='size-7 rounded-md' />
          </div>
        </div>
      </div>
    </div>
  );
}
