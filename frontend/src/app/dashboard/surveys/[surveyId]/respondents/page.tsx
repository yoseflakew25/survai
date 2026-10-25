import { RespondentsView } from '@/features/respondents/components/respondents-view';
import PageContainer from '@/components/layout/page-container';
import { DataTableSkeleton } from '@/components/ui/table/data-table-skeleton';
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
        fallback={
          <DataTableSkeleton
            columnCount={5}
            rowCount={6}
            filterCount={0}
            withViewOptions={false}
            cellWidths={['12rem', '10rem', '6rem', '8rem', '5rem']}
          />
        }
      >
        <RespondentsView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
