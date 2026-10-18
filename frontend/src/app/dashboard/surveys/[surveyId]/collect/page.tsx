import { CollectView } from '@/features/collect/components/collect-view';
import PageContainer from '@/components/layout/page-container';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Collect'
};

/**
 * Auth-gated: do not SSR-prefetch. Server has no browser cookies.
 */
export default async function CollectPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<CollectPageSkeleton />}>
        <CollectView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}

function CollectPageSkeleton() {
  return (
    <div className='space-y-4'>
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
