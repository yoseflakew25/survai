import PageContainer from '@/components/layout/page-container';
import { CollectView } from '@/features/collect/components/collect-view';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collect Responses | Survey Copilot'
};

export default async function CollectPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  // In production, fetch from API. Using mock data for now.
  return (
    <PageContainer
      pageTitle='Collect Responses'
      pageDescription='Publish your survey and share it with respondents'
    >
      <CollectView
        surveyId={surveyId}
        surveyTitle='Community Health Assessment 2026'
        status='draft'
        responseCount={0}
      />
    </PageContainer>
  );
}
