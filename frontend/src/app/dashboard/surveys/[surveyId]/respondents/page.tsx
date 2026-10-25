import { RespondentsView } from '@/features/respondents/components/respondents-view';
import PageContainer from '@/components/layout/page-container';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Respondents'
};

/**
 * Auth-gated: do not SSR-prefetch. Server fetch has no browser cookies.
 */
export default async function RespondentsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense
        fallback={<SurveyActivityFallback activity='fetch-respondents' />}
      >
        <RespondentsView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
