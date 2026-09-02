import PageContainer from '@/components/layout/page-container';
import { ReportView } from '@/features/reports/components/report-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Report | Survey Copilot'
};

export default async function ReportsPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer
      pageTitle='Report Workspace'
      pageDescription='Generate AI-powered reports from your survey data'
    >
      <ReportView surveyId={surveyId} />
    </PageContainer>
  );
}
