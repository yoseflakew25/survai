import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { surveyByIdOptions } from '@/features/builder/api/queries';
import { BuilderView } from '@/features/builder/components/builder-view';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Build Survey | Survey Copilot'
};

export default async function BuildPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(surveyByIdOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer
        pageTitle='Survey Builder'
        pageDescription='Design sections and questions for your survey'
      >
        <Suspense fallback={<BuildPageSkeleton />}>
          <BuilderView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}

function BuildPageSkeleton() {
  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      <div className='space-y-4 lg:col-span-2'>
        <Skeleton className='h-20 w-full rounded-xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
      </div>
      <div className='space-y-6'>
        <Skeleton className='h-40 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
        <Skeleton className='h-32 w-full rounded-xl' />
      </div>
    </div>
  );
}
