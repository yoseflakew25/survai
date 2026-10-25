'use client';

import type { ReactNode } from 'react';
import { useQuery, useSuspenseQuery } from '@tanstack/react-query';
import {
  analyticsSummaryOptions,
  distributionsOptions,
  crossTabOptions
} from '../api/queries';
import { AnalyticsSummaryStats } from './analytics-summary-stats';
import { DistributionChart } from './distribution-chart';
import { CrossTabTable } from './cross-tab-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

const CROSSTAB_TYPES = new Set([
  'single_choice',
  'dropdown',
  'rating_scale'
]);

interface AnalyticsDashboardProps {
  surveyId: string;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  return <AnalyticsContent surveyId={surveyId} />;
}

/** Shared section chrome used across the page's main column. */
function AnalyticsSection({
  icon,
  title,
  subtitle,
  badge,
  children
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader icon={icon} title={title} subtitle={subtitle} badge={badge} />
      <SurvaiPanelBody>{children}</SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function AnalyticsContent({ surveyId }: { surveyId: string }) {
  const { data: summary } = useSuspenseQuery(analyticsSummaryOptions(surveyId));
  const { data: distributions } = useSuspenseQuery(
    distributionsOptions(surveyId)
  );

  const crosstabAxes = distributions.filter((d) =>
    CROSSTAB_TYPES.has(d.questionType)
  );
  const questionAId = crosstabAxes[0]?.questionId ?? '';
  const questionBId = crosstabAxes[1]?.questionId ?? '';
  const { data: crossTab, isLoading: crossTabLoading } = useQuery(
    crossTabOptions(surveyId, questionAId, questionBId)
  );

  return (
    <div className='space-y-4'>
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary Stats */}
          <AnalyticsSection
            icon={<Icons.activity className='h-3.5 w-3.5' />}
            title='Response Summary'
            subtitle='Overview of collected survey responses'
            badge={
              summary.surveyVersionId ? (
                <Badge variant='secondary' className='font-mono text-[10px]'>
                  ver {summary.surveyVersionId.slice(0, 8)}
                </Badge>
              ) : undefined
            }
          >
            <AnalyticsSummaryStats summary={summary} />
          </AnalyticsSection>

          {/* Distribution Charts */}
          <AnalyticsSection
            icon={<Icons.analytics className='h-3.5 w-3.5' />}
            title='Question Distributions'
            subtitle='Per-question response breakdown'
            badge={
              <Badge variant='secondary' className='text-xs'>
                {distributions.length} charts
              </Badge>
            }
          >
            {distributions.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No categorical questions to chart yet — publish the survey and
                collect responses first.
              </p>
            ) : (
              <div className='grid gap-4 md:grid-cols-2'>
                {distributions.map((dist) => (
                  <DistributionChart
                    key={dist.questionId}
                    distribution={dist}
                    surveyId={surveyId}
                  />
                ))}
              </div>
            )}
          </AnalyticsSection>

          {/* Cross-Tab */}
          <AnalyticsSection
            icon={<Icons.kanban className='h-3.5 w-3.5' />}
            title='Cross-Tabulation'
            subtitle={
              crossTab
                ? `${crossTab.questionAText} × ${crossTab.questionBText}`
                : 'Compare two categorical questions'
            }
            badge={
              crossTab ? (
                <Badge variant='secondary' className='text-xs'>
                  {crossTab.totalResponses} responses
                </Badge>
              ) : null
            }
          >
            {!questionAId || !questionBId ? (
              <p className='text-sm text-muted-foreground'>
                Need at least two single-choice, dropdown, or rating questions
                to build a cross-tab.
              </p>
            ) : crossTabLoading ? (
              <Skeleton className='h-56 w-full rounded-lg' />
            ) : crossTab ? (
              <CrossTabTable result={crossTab} />
            ) : (
              <p className='text-sm text-muted-foreground'>
                Cross-tab could not be loaded for this survey.
              </p>
            )}
          </AnalyticsSection>
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          <SurvaiBrandCard
            title='Generate Report?'
            description='AI will create a comprehensive report with findings and recommendations'
          >
            <Link href={`/dashboard/surveys/${surveyId}/reports`} className='block w-full'>
              <Button
                className='h-11 w-full rounded-xl border border-foreground/15 bg-foreground font-semibold text-background hover:bg-foreground/90'
                size='lg'
              >
                Generate Report
                <Icons.arrowRight className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </SurvaiBrandCard>
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main column */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary stats section */}
          <div className='rounded-lg border'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-36 rounded' />
                  <Skeleton className='h-3 w-52 rounded' />
                </div>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3 p-4 xl:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-28 w-full rounded-lg' />
              ))}
            </div>
          </div>

          {/* Charts section */}
          <div className='rounded-lg border'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-40 rounded' />
                  <Skeleton className='h-3 w-48 rounded' />
                </div>
              </div>
            </div>
            <div className='grid gap-4 p-4 md:grid-cols-2'>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className='h-64 w-full rounded-lg' />
              ))}
            </div>
          </div>

          {/* Cross-tab section */}
          <div className='rounded-lg border'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-40 rounded' />
                  <Skeleton className='h-3 w-56 rounded' />
                </div>
              </div>
            </div>
            <div className='p-4'>
              <Skeleton className='h-56 w-full rounded-lg' />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          <Skeleton className='h-56 w-full rounded-xl' />
          <Skeleton className='h-64 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
