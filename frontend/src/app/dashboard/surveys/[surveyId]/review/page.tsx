import { ReviewerView } from '@/features/reviewer/components/reviewer-view';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Review'
};

/**
 * Auth-gated: do not SSR-prefetch survey/review. Server fetch has no browser
 * cookies, so dehydrate would reject with "Could not validate credentials".
 * ReviewerView loads via useSuspenseQuery after RequireAuth.
 */
export default async function ReviewPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<ReviewPageSkeleton />}>
        <ReviewerView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}

function ReviewPageSkeleton() {
  return (
    <div className='space-y-5'>
      <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <div className='flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5'>
          <div className='space-y-2'>
            <Skeleton className='h-6 w-64 rounded-lg' />
            <Skeleton className='h-3 w-48 rounded' />
          </div>
          <Skeleton className='h-10 w-52 rounded-2xl' />
        </div>
      </div>
      <div className='grid gap-6 lg:grid-cols-[1fr_340px]'>
        <div className='space-y-5'>
          <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
            <div className='flex items-center gap-3 border-b border-border bg-muted/30 px-4 py-3'>
              <Skeleton className='size-7 rounded-full' />
              <Skeleton className='h-4 w-40 rounded' />
            </div>
            <div className='space-y-0 divide-y divide-border'>
              <div className='flex gap-3 px-4 py-3'>
                <Skeleton className='size-7 shrink-0 rounded-full' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-3 w-24 rounded' />
                  <Skeleton className='h-4 w-full rounded' />
                </div>
              </div>
              <div className='flex gap-3 px-4 py-3'>
                <Skeleton className='size-7 shrink-0 rounded-full' />
                <div className='flex-1 space-y-2'>
                  <Skeleton className='h-3 w-20 rounded' />
                  <Skeleton className='h-4 w-4/5 rounded' />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className='space-y-4'>
          <Skeleton className='h-36 w-full rounded-2xl' />
          <Skeleton className='h-56 w-full rounded-2xl' />
        </div>
      </div>
    </div>
  );
}
