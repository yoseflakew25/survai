'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { publicSurveyOptions } from '../api/queries';
import { CollectionForm } from './collection-form';
import { Icons } from '@/components/icons';
import { notFound } from 'next/navigation';

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
      <div className='flex min-h-dvh flex-col items-center justify-center bg-background p-4'>
        <div className='text-center'>
          <Icons.alertCircle className='text-muted-foreground mx-auto mb-4 h-12 w-12' />
          <h1 className='mb-2 text-lg font-semibold'>Survey not found</h1>
          <p className='text-muted-foreground text-sm'>
            This survey link may have expired or is invalid.
          </p>
        </div>
      </div>
    );
  }

  return <CollectionForm survey={survey} />;
}

export function CollectionLoading() {
  return (
    <div className='flex min-h-dvh flex-col items-center justify-center bg-background'>
      <div className='flex flex-col items-center gap-3'>
        <Icons.spinner className='text-primary size-8 animate-spin' />
        <p className='text-muted-foreground text-sm'>Loading survey...</p>
      </div>
    </div>
  );
}
