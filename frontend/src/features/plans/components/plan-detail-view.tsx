'use client';

import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { planByIdOptions } from '../api/queries';
import { PlanEditor } from './plan-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface PlanDetailViewProps {
  planId: string;
  /** When opened from a survey hub, regenerate that survey instead of creating another. */
  surveyId?: string;
}

export function PlanDetailView({ planId, surveyId }: PlanDetailViewProps) {
  return (
    <AuthQueryBoundary fallback={<PlanDetailSkeleton />}>
      <PlanDetailContent planId={planId} surveyId={surveyId} />
    </AuthQueryBoundary>
  );
}

function PlanDetailContent({
  planId,
  surveyId
}: {
  planId: string;
  surveyId?: string;
}) {
  const { data: plan, refetch } = useSuspenseQuery(planByIdOptions(planId));

  if (!plan) {
    const reviewHref = surveyId
      ? `/dashboard/surveys/${surveyId}/review`
      : '/dashboard/surveys';
    return (
      <div className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center'>
        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-2xl'>
          <Icons.plan className='size-5 text-foreground' />
        </div>
        <div className='space-y-1.5'>
          <h2 className='font-display text-xl font-extrabold tracking-tight'>
            Plan not found
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            This research plan is missing or no longer accessible. You can still
            work on the survey questionnaire.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link
              href={reviewHref}
              aria-label={surveyId ? 'Go to survey review' : 'Back to surveys'}
            />
          }
          className='h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 font-semibold text-brand-foreground'
        >
          {surveyId ? 'Go to Review' : 'Back to Surveys'}
          <Icons.arrowRight className='ml-1.5 size-4' />
        </Button>
      </div>
    );
  }

  return (
    <PlanEditor
      plan={plan}
      surveyId={surveyId}
      onPlanUpdate={() => {
        refetch();
      }}
    />
  );
}

export function PlanDetailSkeleton() {
  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      <div className='space-y-6 lg:col-span-2'>
        <Skeleton className='h-48 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
        <Skeleton className='h-64 w-full rounded-xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
      </div>
      <div className='space-y-4'>
        <Skeleton className='h-32 w-full rounded-xl' />
        <Skeleton className='h-48 w-full rounded-xl' />
        <Skeleton className='h-32 w-full rounded-xl' />
      </div>
    </div>
  );
}
