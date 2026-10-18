'use client';

import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';

import { surveyByIdOptions } from '@/features/builder/api/queries';
import {
  PlanDetailView,
  PlanDetailSkeleton
} from '@/features/plans/components/plan-detail-view';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface SurveyPlanViewProps {
  surveyId: string;
}

export function SurveyPlanView({ surveyId }: SurveyPlanViewProps) {
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));

  if (!survey) {
    notFound();
  }

  if (!survey.planId) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center'>
        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-2xl'>
          <Icons.plan className='size-5 text-foreground' />
        </div>
        <div className='space-y-1.5'>
          <h2 className='font-display text-xl font-extrabold tracking-tight'>
            No plan linked
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>
            This survey wasn&apos;t created from a plan, or the plan is missing.
            You can still review and edit questions.
          </p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href={`/dashboard/surveys/${surveyId}/review`} />}
          className='h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 font-semibold text-foreground'
        >
          Go to Review
          <Icons.arrowRight className='ml-1.5 size-4' />
        </Button>
      </div>
    );
  }

  return <PlanDetailView planId={survey.planId} surveyId={surveyId} />;
}

export function SurveyPlanSkeleton() {
  return <PlanDetailSkeleton />;
}
