import { Suspense } from 'react';
import { SurveyTable } from '@/features/surveys/components/survey-tables';
import { Skeleton } from '@/components/ui/skeleton';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Surveys',
  description: 'Build, publish, and collect responses for your surveys'
};

/**
 * Auth-gated list: do not SSR-prefetch. Server fetch has no browser cookies,
 * so a pending dehydrate rejects with "Could not validate credentials".
 * SurveyTable loads via useSuspenseQuery after RequireAuth.
 */
export default function SurveysPage() {
  return (
    <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
      <Suspense fallback={<SurveysPageSkeleton />}>
        <SurveyTable />
      </Suspense>
    </div>
  );
}

function SurveysPageSkeleton() {
  return (
    <div className='flex flex-1 flex-col space-y-5'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-40 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <Skeleton className='h-9 w-36 rounded-xl' />
      </div>
      <Skeleton className='h-64 w-full rounded-xl' />
    </div>
  );
}
