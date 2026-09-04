'use client';

import type { ReactNode } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import {
  analyticsSummaryOptions,
  distributionsOptions,
  crossTabOptions,
  savedAnalysesOptions
} from '../api/queries';
import { AnalyticsSummaryStats } from './analytics-summary-stats';
import { DistributionChart } from './distribution-chart';
import { CrossTabTable } from './cross-tab-table';
import { SavedAnalyses } from './saved-analyses';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { SurveyStepper } from '@/components/survey-stepper';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';

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
    <div className='rounded-lg border bg-background'>
      <div className='border-b bg-muted/30 px-4 py-3'>
        <div className='flex items-center gap-3'>
          <div className='bg-primary text-primary-foreground flex h-6 w-6 items-center justify-center rounded'>
            {icon}
          </div>
          <div>
            <h3 className='font-semibold text-primary'>{title}</h3>
            <p className='text-muted-foreground text-xs'>{subtitle}</p>
          </div>
          {badge && <div className='ml-auto'>{badge}</div>}
        </div>
      </div>
      <div className='p-4'>{children}</div>
    </div>
  );
}

function AnalyticsContent({ surveyId }: { surveyId: string }) {
  const { data: summary } = useSuspenseQuery(analyticsSummaryOptions(surveyId));
  const { data: distributions } = useSuspenseQuery(distributionsOptions(surveyId));
  const { data: crossTab } = useSuspenseQuery(crossTabOptions(surveyId));
  const { data: savedAnalyses } = useSuspenseQuery(savedAnalysesOptions(surveyId));

  return (
    <div className='space-y-4'>
      {/* Header + progress stepper side by side */}
      <div className='flex items-end justify-between gap-4'>
        <Heading
          title='Analytics'
          description='Explore response data with charts, distributions, and cross-tabs'
        />
        <SurveyStepper
          currentStep={5}
         
        />
      </div>

      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary Stats */}
          <AnalyticsSection
            icon={<Icons.activity className='h-3.5 w-3.5' />}
            title='Response Summary'
            subtitle='Overview of collected survey responses'
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
            <div className='grid gap-4 md:grid-cols-2'>
              {distributions.map((dist) => (
                <DistributionChart key={dist.questionId} distribution={dist} />
              ))}
            </div>
          </AnalyticsSection>

          {/* Cross-Tab */}
          <AnalyticsSection
            icon={<Icons.kanban className='h-3.5 w-3.5' />}
            title='Cross-Tabulation'
            subtitle={`${crossTab.questionAText} × ${crossTab.questionBText}`}
            badge={
              <Badge variant='secondary' className='text-xs'>
                {crossTab.totalResponses} responses
              </Badge>
            }
          >
            <CrossTabTable result={crossTab} />
          </AnalyticsSection>
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
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
              <div>
                <h3 className='text-lg font-semibold text-primary-foreground'>Generate Report?</h3>
                <p className='text-primary-foreground/80 text-sm leading-relaxed'>
                  AI will create a comprehensive report with findings and recommendations
                </p>
              </div>
              <Link href={`/dashboard/surveys/${surveyId}/reports`} className='w-full'>
                <Button className='w-full' size='lg' variant='secondary'>
                  Generate Report
                  <Icons.arrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
              
            </div>
          </div>

          {/* Saved Analyses */}
          <SavedAnalyses analyses={savedAnalyses} />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className='space-y-4'>
      {/* Header + stepper row */}
      <div className='grid items-center gap-3 lg:grid-cols-[auto_minmax(0,1fr)]'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-40 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <Skeleton className='h-14 w-full rounded-lg' />
      </div>

      {/* Content grid */}
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
