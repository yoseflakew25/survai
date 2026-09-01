import { HydrationBoundary, dehydrate } from '@tanstack/react-query';
import { getQueryClient } from '@/lib/query-client';
import { surveysListQueryOptions } from '@/features/surveys/api/queries';
import { SurveyTable } from '@/features/surveys/components/survey-tables';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Surveys | Survey Copilot',
  description: 'Manage your surveys'
};

export default function SurveysPage() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(surveysListQueryOptions({}));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className='flex flex-1 flex-col px-4 pt-2 pb-4 md:px-6 md:pt-4'>
        <SurveyTable />
      </div>
    </HydrationBoundary>
  );
}
