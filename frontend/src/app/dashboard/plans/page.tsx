import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { plansQueryOptions } from '@/features/plans/api/queries';
import { PlanTable } from '@/features/plans/components/plan-table';
import PageContainer from '@/components/layout/page-container';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Plans | Survey Copilot',
  description: 'Manage your survey plans'
};

export default function PlansPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(plansQueryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PageContainer
        pageTitle='Survey Plans'
        pageDescription='Create and manage research plans that guide your survey design'
      >
        <PlanTable />
      </PageContainer>
    </HydrationBoundary>
  );
}
