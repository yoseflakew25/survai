import { ReviewerView } from '@/features/reviewer/components/reviewer-view';
import PageContainer from '@/components/layout/page-container';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
import { Metadata } from 'next';
import { Suspense } from 'react';

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
      <Suspense fallback={<SurveyActivityFallback activity='fetch-review' />}>
        <ReviewerView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
