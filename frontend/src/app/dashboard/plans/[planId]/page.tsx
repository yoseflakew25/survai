import { PlanDetailView, PlanDetailSkeleton } from '@/features/plans/components/plan-detail-view';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Review Survey Plan | SurvAI'
};

/**
 * Auth-gated: do not SSR-prefetch. Server fetch has no browser cookies,
 * so prefetches fail with "Could not validate credentials".
 */
export default async function PlanDetailPage({
  params
}: {
  params: Promise<{ planId: string }>;
}) {
  const { planId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<PlanDetailSkeleton />}>
        <PlanDetailView planId={planId} />
      </Suspense>
    </PageContainer>
  );
}
