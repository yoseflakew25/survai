import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { latestReviewOptions } from '@/features/reviewer/api/queries';
import { ReviewerView } from '@/features/reviewer/components/reviewer-view';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Review Survey | Survey Copilot'
};

export default async function ReviewPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(latestReviewOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<ReviewPageSkeleton />}>
          <ReviewerView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      <div className='space-y-4 lg:col-span-2'>
        <Skeleton className='h-48 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
      </div>
      <div className='space-y-6'>
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
      </div>
    </div>
  );
}
