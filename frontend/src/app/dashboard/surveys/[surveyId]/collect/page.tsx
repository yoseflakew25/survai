import { CollectView } from '@/features/collect/components/collect-view';
import PageContainer from '@/components/layout/page-container';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
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
      <Suspense fallback={<SurveyActivityFallback activity='fetch-collect' />}>
        <CollectView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
