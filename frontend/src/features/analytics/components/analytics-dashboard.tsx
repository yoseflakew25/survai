'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import {
  analyticsSummaryOptions,
  distributionsOptions,
  savedAnalysesOptions
} from '../api/queries';
import { AnalyticsSummaryStats } from './analytics-summary-stats';
import { DistributionChart } from './distribution-chart';
import { CrossTabTable } from './cross-tab-table';
import { SavedAnalyses } from './saved-analyses';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface AnalyticsDashboardProps {
  surveyId: string;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  return <AnalyticsContent surveyId={surveyId} />;
}

function AnalyticsContent({ surveyId }: { surveyId: string }) {
  const { data: summary } = useSuspenseQuery(analyticsSummaryOptions(surveyId));
  const { data: distributions } = useSuspenseQuery(distributionsOptions(surveyId));
  const { data: savedAnalyses } = useSuspenseQuery(savedAnalysesOptions(surveyId));

  return (
    <div className='space-y-6'>
      {/* Summary stats */}
      <AnalyticsSummaryStats summary={summary} />

      <Separator />

      {/* Distribution charts */}
      <div>
        <h3 className='mb-4 text-sm font-medium'>Question Distributions</h3>
        <div className='grid gap-4 md:grid-cols-2'>
          {distributions.map((dist) => (
            <DistributionChart key={dist.questionId} distribution={dist} />
          ))}
        </div>
      </div>

      <Separator />

      {/* Cross-tab and saved analyses */}
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='lg:col-span-2'>
          <CrossTabTable
            result={{
              questionAId: 'q_001',
              questionAText: 'Age group',
              questionBId: 'q_007',
              questionBText: 'Healthcare visit frequency',
              rowLabels: ['18–24', '25–34', '35–44', '45–54', '55+'],
              colLabels: ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never'],
              cells: [
                { rowLabel: '18–24', colLabel: 'Weekly', count: 2, percent: 7.1 },
                { rowLabel: '18–24', colLabel: 'Monthly', count: 5, percent: 17.9 },
                { rowLabel: '18–24', colLabel: 'Quarterly', count: 10, percent: 35.7 },
                { rowLabel: '18–24', colLabel: 'Annually', count: 8, percent: 28.6 },
                { rowLabel: '18–24', colLabel: 'Never', count: 3, percent: 10.7 },
                { rowLabel: '25–34', colLabel: 'Weekly', count: 3, percent: 6.7 },
                { rowLabel: '25–34', colLabel: 'Monthly', count: 12, percent: 26.7 },
                { rowLabel: '25–34', colLabel: 'Quarterly', count: 16, percent: 35.6 },
                { rowLabel: '25–34', colLabel: 'Annually', count: 10, percent: 22.2 },
                { rowLabel: '25–34', colLabel: 'Never', count: 4, percent: 8.9 },
                { rowLabel: '35–44', colLabel: 'Weekly', count: 4, percent: 10.5 },
                { rowLabel: '35–44', colLabel: 'Monthly', count: 10, percent: 26.3 },
                { rowLabel: '35–44', colLabel: 'Quarterly', count: 13, percent: 34.2 },
                { rowLabel: '35–44', colLabel: 'Annually', count: 8, percent: 21.1 },
                { rowLabel: '35–44', colLabel: 'Never', count: 3, percent: 7.9 },
                { rowLabel: '45–54', colLabel: 'Weekly', count: 2, percent: 9.5 },
                { rowLabel: '45–54', colLabel: 'Monthly', count: 5, percent: 23.8 },
                { rowLabel: '45–54', colLabel: 'Quarterly', count: 7, percent: 33.3 },
                { rowLabel: '45–54', colLabel: 'Annually', count: 4, percent: 19.0 },
                { rowLabel: '45–54', colLabel: 'Never', count: 3, percent: 14.3 },
                { rowLabel: '55+', colLabel: 'Weekly', count: 1, percent: 12.5 },
                { rowLabel: '55+', colLabel: 'Monthly', count: 2, percent: 25.0 },
                { rowLabel: '55+', colLabel: 'Quarterly', count: 2, percent: 25.0 },
                { rowLabel: '55+', colLabel: 'Annually', count: 1, percent: 12.5 },
                { rowLabel: '55+', colLabel: 'Never', count: 2, percent: 25.0 }
              ],
              totalResponses: 138
            }}
          />
        </div>
        <div>
          <SavedAnalyses analyses={savedAnalyses} />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className='space-y-6'>
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-28 w-full rounded-xl' />
        ))}
      </div>
      <Skeleton className='h-px w-full' />
      <div className='grid gap-4 md:grid-cols-2'>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className='h-64 w-full rounded-xl' />
        ))}
      </div>
    </div>
  );
}
