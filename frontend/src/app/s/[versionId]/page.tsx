import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { publicSurveyOptions } from '@/features/collection/api/queries';
import {
  CollectionView,
  CollectionLoading
} from '@/features/collection/components/collection-view';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Survey',
  robots: {
    index: false,
    follow: false
  }
};

export default async function CollectionPage({
  params
}: {
  params: Promise<{ versionId: string }>;
}) {
  const { versionId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(publicSurveyOptions(versionId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<CollectionLoading />}>
        <CollectionView versionId={versionId} />
      </Suspense>
    </HydrationBoundary>
  );
}
