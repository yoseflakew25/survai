import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { Suspense } from 'react';
import type { Metadata } from 'next';

import PageContainer from '@/components/layout/page-container';
import { getQueryClient } from '@/lib/query-client';
import { surveyByIdOptions } from '@/features/builder/api/queries';
import {
  SurveyPlanSkeleton,
  SurveyPlanView
} from '@/features/surveys/components/survey-plan-view';

export const metadata: Metadata = {
  title: 'Plan'
};

export default async function SurveyPlanPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(surveyByIdOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<SurveyPlanSkeleton />}>
          <SurveyPlanView surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
