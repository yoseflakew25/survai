import { Suspense } from 'react';
import type { Metadata } from 'next';

import PageContainer from '@/components/layout/page-container';
import { SurveyPlanView } from '@/features/surveys/components/survey-plan-view';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';

export const metadata: Metadata = {
  title: 'Plan'
};

/**
 * Auth-gated: do not SSR-prefetch. Server has no browser cookies.
 */
export default async function SurveyPlanPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<SurveyActivityFallback activity='fetch-plan' />}>
        <SurveyPlanView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
