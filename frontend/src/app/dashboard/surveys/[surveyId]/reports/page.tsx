import { ReportView } from '@/features/reports/components/report-view';
import PageContainer from '@/components/layout/page-container';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
import { Metadata } from 'next';
import { Suspense } from 'react';

export const metadata: Metadata = {
  title: 'Report'
};

export default async function ReportsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer>
      <Suspense fallback={<SurveyActivityFallback activity='fetch-report' />}>
        <ReportView surveyId={surveyId} />
      </Suspense>
    </PageContainer>
  );
}
