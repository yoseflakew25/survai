'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { publicSurveyOptions } from '../api/queries';
import { CollectionForm } from './collection-form';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';

interface CollectionViewProps {
  versionId: string;
}

export function CollectionView({ versionId }: CollectionViewProps) {
  return <CollectionViewContent versionId={versionId} />;
}

function CollectionViewContent({ versionId }: { versionId: string }) {
  const { data: survey } = useSuspenseQuery(publicSurveyOptions(versionId));

  if (!survey) {
    return (
      <div className='bg-muted/30 flex min-h-dvh flex-col items-center justify-center px-4'>
        <div className='w-full max-w-md rounded-xl border bg-background p-8 text-center shadow-sm'>
          <div className='bg-primary/10 mx-auto mb-5 flex size-14 items-center justify-center rounded-full'>
            <Icons.lock className='text-primary size-6' />
          </div>
          <h1 className='text-lg font-bold tracking-tight'>Survey unavailable</h1>
          <p className='text-muted-foreground mt-1.5 text-sm leading-relaxed'>
            This survey link is invalid or has expired. Please contact the survey
            owner for a new link.
          </p>
        </div>
        <p className='text-muted-foreground mt-6 text-[11px]'>
          Powered by{' '}
          <span className='text-primary inline-flex items-center gap-1 font-medium'>
            <Icons.sparkles className='size-3' />
            Survey Copilot
          </span>
        </p>
      </div>
    );
  }

  return <CollectionForm survey={survey} />;
}

export function CollectionLoading() {
  return (
    <div className='bg-muted/30 min-h-dvh'>
      <div className='mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8'>
        {/* Hero skeleton */}
        <div className='rounded-xl border bg-background p-6 shadow-sm sm:p-8'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-28 rounded' />
            <Skeleton className='h-5 w-24 rounded-full' />
          </div>
          <Skeleton className='mt-4 h-7 w-3/4 max-w-md rounded' />
          <Skeleton className='mt-2 h-4 w-full max-w-xl rounded' />
          <Skeleton className='mt-2 h-4 w-2/3 max-w-lg rounded' />
          <div className='mt-5 flex gap-2'>
            <Skeleton className='h-6 w-24 rounded-full' />
            <Skeleton className='h-6 w-28 rounded-full' />
            <Skeleton className='h-6 w-20 rounded-full' />
          </div>
        </div>

        {/* Progress skeleton */}
        <div className='mt-4 rounded-xl border bg-background px-4 py-3'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-48 rounded' />
            <Skeleton className='h-4 w-24 rounded' />
          </div>
          <Skeleton className='mt-2.5 h-1.5 w-full rounded-full' />
          <div className='mt-3 flex gap-1.5'>
            <Skeleton className='h-6 w-32 rounded-full' />
            <Skeleton className='h-6 w-28 rounded-full' />
            <Skeleton className='h-6 w-36 rounded-full' />
          </div>
        </div>

        {/* Section skeleton */}
        <div className='mt-4 overflow-hidden rounded-xl border bg-background shadow-sm'>
          <div className='border-b bg-muted/30 px-5 py-4 sm:px-6'>
            <div className='flex items-center gap-3'>
              <Skeleton className='size-7 rounded-full' />
              <div className='flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-56 rounded' />
                <Skeleton className='h-3 w-72 rounded' />
              </div>
              <Skeleton className='h-5 w-24 rounded-full' />
            </div>
          </div>
          <div className='space-y-8 px-5 py-6 sm:px-6'>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className='space-y-3'>
                <div className='flex items-start gap-3'>
                  <Skeleton className='h-4 w-5 rounded' />
                  <div className='flex-1 space-y-1.5'>
                    <Skeleton className='h-4 w-3/4 rounded' />
                    <Skeleton className='h-3 w-1/2 rounded' />
                  </div>
                </div>
                <Skeleton className='ml-8 h-11 w-full rounded-lg' />
              </div>
            ))}
          </div>
          <div className='flex items-center justify-between border-t bg-muted/30 px-4 py-3.5 sm:px-6'>
            <Skeleton className='h-9 w-28 rounded-md' />
            <Skeleton className='h-9 w-28 rounded-md' />
          </div>
        </div>
      </div>
    </div>
  );
}
