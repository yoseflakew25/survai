'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { plansQueryOptions } from '../api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { CreatePlanForm } from './create-plan-form';

const statusVariant = {
  approved: 'default' as const,
  draft: 'secondary' as const
};

export function PlanTable() {
  return <PlanTableContent />;
}

function PlanTableContent() {
  const t = useTranslations('plan');
  const locale = useLocale();
  const { data } = useSuspenseQuery(plansQueryOptions());
  const plans = data?.plans ?? [];
  const dateLocale = locale === 'am' ? 'am-ET' : 'en-US';

  return (
    <div className='space-y-4'>
      {/* Header action */}
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>{t('plansCount', { count: plans.length })}</p>
        <CreatePlanForm>
          <Button>
            <Icons.add className='mr-2 h-4 w-4' />
            {t('newPlan')}
          </Button>
        </CreatePlanForm>
      </div>

      {/* Plan grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Icons.plan className='text-muted-foreground mb-3 h-10 w-10' />
            <p className='text-muted-foreground mb-4 text-sm'>{t('emptyPlans')}</p>
            <CreatePlanForm>
              <Button variant='outline'>
                <Icons.add className='mr-2 h-4 w-4' />
                {t('createPlan')}
              </Button>
            </CreatePlanForm>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {plans.map((plan) => (
            <Link
              key={plan.id}
              href={`/dashboard/plans/${plan.id}`}
              aria-label={t('openPlanAria', {
                goal: plan.researchGoal.slice(0, 80)
              })}
            >
              <Card className='transition-shadow hover:shadow-md'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <CardTitle className='text-base'>
                      {plan.researchGoal.slice(0, 60)}
                      {plan.researchGoal.length > 60 ? '…' : ''}
                    </CardTitle>
                    <Badge variant={statusVariant[plan.status]}>
                      {plan.status === 'approved' ? t('statusApproved') : t('statusDraft')}
                    </Badge>
                  </div>
                  <CardDescription>
                    {t('createdOn', {
                      date: new Date(plan.createdAt).toLocaleDateString(dateLocale)
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Icons.check className='h-4 w-4' />
                      {t('objectivesCount', { count: plan.objectives.length })}
                    </span>
                    <span className='flex items-center gap-1'>
                      <Icons.chat className='h-4 w-4' />
                      {t('questionsCount', { count: plan.researchQuestions.length })}
                    </span>
                    {plan.proposedSections.length > 0 && (
                      <span className='flex items-center gap-1'>
                        <Icons.forms className='h-4 w-4' />
                        {t('sectionsCount', {
                          count: plan.proposedSections.length
                        })}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function PlanTableSkeleton() {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className='h-40 w-full rounded-xl' />
      ))}
    </div>
  );
}
