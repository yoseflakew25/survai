import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { planByIdOptions } from '@/features/plans/api/queries';
import { PlanDetailView, PlanDetailSkeleton } from '@/features/plans/components/plan-detail-view';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Review Survey Plan | SurvAI'
};

export default async function PlanDetailPage({
  params
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(planByIdOptions(planId));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer
        pageTitle='Review Survey Plan'
        pageDescription='Review and refine your AI-generated plan before building the survey'
      >
        <Suspense fallback={<PlanDetailSkeleton />}>
          <PlanDetailView planId={planId} />
        </Suspense>
      </PageContainer>
    </HydrationBoundary>
  );
}
