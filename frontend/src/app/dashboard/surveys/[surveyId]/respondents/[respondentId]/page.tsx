import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { respondentDetailOptions } from '@/features/respondents/api/queries';
import { RespondentDetailView } from '@/features/respondents/components/respondent-detail-view';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Respondent | Survey Copilot'
};

export default async function RespondentDetailPage({
  params
}: {
  params: Promise<{ surveyId: string; respondentId: string }>;
}) {
  const { surveyId, respondentId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    respondentDetailOptions(surveyId, respondentId)
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<RespondentDetailSkeleton />}>
          <RespondentDetailView
            surveyId={surveyId}
            respondentId={respondentId}
          />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function RespondentDetailSkeleton() {
  return (
    <div className='flex flex-1 flex-col'>
      {/* Breadcrumb back link */}
      <div className='flex items-center gap-2 px-6 pt-5'>
        <Skeleton className='h-4 w-28 rounded' />
        <Skeleton className='h-4 w-4 rounded' />
        <Skeleton className='h-4 w-16 rounded' />
      </div>

      {/* Respondent header */}
      <div className='flex flex-wrap items-start justify-between gap-6 px-6 py-5'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-48 rounded' />
          <Skeleton className='h-4 w-44 rounded' />
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Skeleton className='h-6 w-24 rounded-full' />
          <Skeleton className='h-4 w-px' />
          <Skeleton className='h-6 w-40 rounded-full' />
          <Skeleton className='h-6 w-20 rounded-full' />
          <Skeleton className='h-6 w-28 rounded-full' />
        </div>
      </div>

      <Skeleton className='h-px mx-6' />

      {/* Two-column body */}
      <div className='flex flex-1 gap-6 px-6 pb-10'>
        {/* Answers column */}
        <div className='flex flex-1 flex-col gap-4 min-w-0'>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className='overflow-hidden rounded-lg border bg-background'
            >
              <div className='flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3'>
                <Skeleton className='flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold' />
                <Skeleton className='h-4 w-44 rounded' />
                <Skeleton className='ml-auto h-4 w-20 rounded' />
              </div>
              <div className='divide-y'>
                {Array.from({ length: 2 }).map((_, j) => (
                  <div
                    key={j}
                    className='flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8'
                  >
                    <div className='flex-1 space-y-1.5'>
                      <Skeleton className='h-4 w-full rounded' />
                      <Skeleton className='h-3 w-1/2 rounded' />
                    </div>
                    <Skeleton className='h-6 w-36 shrink-0 rounded-md sm:w-40 sm:justify-end' />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar */}
        <div
          className='shrink-0 space-y-4'
          style={{ width: '260px' }}
        >
          {Array.from({ length: 2 }).map((_, i) => (
            <div
              key={i}
              className='overflow-hidden rounded-lg border bg-background'
            >
              <div className='border-b bg-muted/30 px-4 py-3'>
                <Skeleton className='h-4 w-20 rounded' />
              </div>
              <div className='px-4 py-3 space-y-3'>
                {Array.from({ length: 4 }).map((_, j) => (
                  <div
                    key={j}
                    className='flex items-center justify-between'
                  >
                    <Skeleton className='h-4 w-16 rounded' />
                    <Skeleton className='h-4 w-24 rounded' />
                  </div>
                ))}
              </div>
              <div className='border-t bg-muted/30 px-4 py-3'>
                <Skeleton className='h-3 w-full rounded-full mb-2' />
                <Skeleton className='h-3 w-3/4 rounded-full' />
              </div>
              <div className='p-3'>
                <Skeleton className='h-8 w-full rounded-md' />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
