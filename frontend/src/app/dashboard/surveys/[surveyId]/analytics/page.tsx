import {
  AnalyticsDashboard,
  AnalyticsDashboardSkeleton
} from '@/features/analytics/components/analytics-dashboard';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Analytics'
};

/**
 * Auth-gated: do not SSR-prefetch. Server fetch has no browser cookies,
 * so prefetches fail and only add delay before the client load.
 */
export default async function AnalyticsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<AnalyticsDashboardSkeleton />}>
        <AnalyticsDashboard surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
