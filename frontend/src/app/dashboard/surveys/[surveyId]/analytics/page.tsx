import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import {
  analyticsSummaryOptions,
  distributionsOptions,
  crossTabOptions,
  savedAnalysesOptions
} from '@/features/analytics/api/queries';
import {
  AnalyticsDashboard,
  AnalyticsDashboardSkeleton
} from '@/features/analytics/components/analytics-dashboard';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Analytics | Survey Copilot'
};

export default async function AnalyticsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(analyticsSummaryOptions(surveyId));
  void queryClient.prefetchQuery(distributionsOptions(surveyId));
  void queryClient.prefetchQuery(crossTabOptions(surveyId));
  void queryClient.prefetchQuery(savedAnalysesOptions(surveyId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer>
        <Suspense fallback={<AnalyticsDashboardSkeleton />}>
          <AnalyticsDashboard surveyId={surveyId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
