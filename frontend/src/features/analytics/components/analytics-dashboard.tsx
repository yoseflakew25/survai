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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

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
      {/* Progress indicator */}
      <div className='rounded-xl border bg-muted/30 p-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Plan Created</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Plan Approved</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Review Survey</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>✓</span>
              <span className='text-sm font-medium'>Collect</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>5</span>
              <span className='text-sm font-medium'>Analytics</span>
            </div>
            <Icons.chevronsRight className='text-muted-foreground h-4 w-4' />
            <div className='flex items-center gap-2'>
              <span className='bg-muted text-muted-foreground flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold'>6</span>
              <span className='text-muted-foreground text-sm'>Report</span>
            </div>
          </div>
          <Badge variant='secondary'>
            {summary.responseCount} responses
          </Badge>
        </div>
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary Stats */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
                  <Icons.analytics className='h-3.5 w-3.5' />
                </div>
                <div>
                  <h3 className='font-semibold'>Response Summary</h3>
                  <p className='text-muted-foreground text-xs'>Overview of collected survey responses</p>
                </div>
                <Badge variant='secondary' className='ml-auto text-xs'>
                  {summary.responseCount} total
                </Badge>
              </div>
            </div>
            <div className='p-4'>
              <AnalyticsSummaryStats summary={summary} />
            </div>
          </div>

          {/* Distribution Charts */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
                  <Icons.analytics className='h-3.5 w-3.5' />
                </div>
                <div>
                  <h3 className='font-semibold'>Question Distributions</h3>
                  <p className='text-muted-foreground text-xs'>Per-question response breakdown</p>
                </div>
                <Badge variant='secondary' className='ml-auto text-xs'>
                  {distributions.length} charts
                </Badge>
              </div>
            </div>
            <div className='p-4'>
              <div className='grid gap-4 md:grid-cols-2'>
                {distributions.map((dist) => (
                  <DistributionChart key={dist.questionId} distribution={dist} />
                ))}
              </div>
            </div>
          </div>

          {/* Cross-Tab */}
          <div className='rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
                  <Icons.forms className='h-3.5 w-3.5' />
                </div>
                <div>
                  <h3 className='font-semibold'>Cross-Tabulation</h3>
                  <p className='text-muted-foreground text-xs'>Age group × healthcare visit frequency</p>
                </div>
              </div>
            </div>
            <div className='p-4'>
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
          </div>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          {/* Primary Action - Generate Report */}
          <div className='relative overflow-hidden rounded-xl border border-primary/20 bg-primary'>
            <div
              className='pointer-events-none absolute inset-0'
              style={{
                backgroundImage:
                  'linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
                maskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)',
                WebkitMaskImage: 'linear-gradient(to right, transparent, black 30%, black 70%, transparent)'
              }}
            />
            <div className='relative space-y-4 p-5'>
              <div className='space-y-1.5'>
                <h3 className='text-base font-semibold text-primary-foreground'>Generate Report?</h3>
                <p className='text-primary-foreground/80 text-xs leading-relaxed'>
                  AI will create a comprehensive report with findings and recommendations
                </p>
              </div>
              <Link href={`/dashboard/surveys/${surveyId}/reports`} className='w-full'>
                <Button className='w-full' size='lg' variant='secondary'>
                  Generate Report
                  <Icons.arrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
              <p className='text-primary-foreground/60 text-center text-[11px]'>
                You can edit the report after generation
              </p>
            </div>
          </div>

          <Separator />

          {/* Saved Analyses */}
          <SavedAnalyses analyses={savedAnalyses} />

          <Separator />

          {/* Quick Stats */}
          <div className='rounded-lg border bg-background p-4'>
            <h3 className='mb-3 text-sm font-semibold'>Quick Stats</h3>
            <div className='space-y-2 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Total Responses</span>
                <span className='font-medium'>{summary.responseCount}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Completion Rate</span>
                <span className='font-medium'>{summary.completionRate}%</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Avg. Duration</span>
                <span className='font-medium'>{summary.avgCompletionMinutes}m</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Charts Generated</span>
                <span className='font-medium'>{distributions.length}</span>
              </div>
            </div>
          </div>
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
