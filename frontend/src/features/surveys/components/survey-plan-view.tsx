'use client';

import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';

import { surveyByIdOptions } from '@/features/builder/api/queries';
import { PlanDetailView } from '@/features/plans/components/plan-detail-view';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';
import { useTranslations } from 'next-intl';

interface SurveyPlanViewProps {
  surveyId: string;
}

export function SurveyPlanView({ surveyId }: SurveyPlanViewProps) {
  return (
    <AuthQueryBoundary fallback={<SurveyActivityFallback activity='fetch-plan' />}>
      <SurveyPlanContent surveyId={surveyId} />
    </AuthQueryBoundary>
  );
}

function SurveyPlanContent({ surveyId }: { surveyId: string }) {
  const t = useTranslations('surveys');
  const tReview = useTranslations('review');
  const { data: survey } = useSuspenseQuery(surveyByIdOptions(surveyId));

  if (!survey) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center'>
        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-none'>
          <Icons.survey className='size-5 text-foreground' />
        </div>
        <div className='space-y-1.5'>
          <h2 className='font-display text-xl font-extrabold tracking-tight'>
            {tReview('notFoundTitle')}
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>{tReview('notFoundDesc')}</p>
        </div>
        <Button
          nativeButton={false}
          render={<Link href='/dashboard/surveys' aria-label={tReview('backToSurveysAria')} />}
          className='h-10 rounded-none border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 font-semibold text-brand-foreground'
        >
          {tReview('backToSurveys')}
          <Icons.arrowRight className='ml-1.5 size-4' />
        </Button>
      </div>
    );
  }

  if (!survey.planId) {
    return (
      <div className='mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center'>
        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-none'>
          <Icons.plan className='size-5 text-foreground' />
        </div>
        <div className='space-y-1.5'>
          <h2 className='font-display text-xl font-extrabold tracking-tight'>
            {t('noPlanLinked')}
          </h2>
          <p className='text-muted-foreground text-sm leading-relaxed'>{t('noPlanLinkedDesc')}</p>
        </div>
        <Button
          nativeButton={false}
          render={
            <Link href={`/dashboard/surveys/${surveyId}/review`} aria-label={t('goToReviewAria')} />
          }
          className='h-10 rounded-none border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 font-semibold text-brand-foreground'
        >
          {t('goToReview')}
          <Icons.arrowRight className='ml-1.5 size-4' />
        </Button>
      </div>
    );
  }

  return <PlanDetailView planId={survey.planId} surveyId={surveyId} />;
}
