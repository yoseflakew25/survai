'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { plansQueryOptions } from '../api/queries';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { CreatePlanForm } from './create-plan-form';

const statusVariant = {
  approved: 'default' as const,
  draft: 'secondary' as const
};

const statusLabel = {
  approved: 'Approved',
  draft: 'Draft'
};

export function PlanTable() {
  return (
    <PlanTableContent />
  );
}

function PlanTableContent() {
  const { data } = useSuspenseQuery(plansQueryOptions());
  const plans = data?.plans ?? [];

  return (
    <div className='space-y-4'>
      {/* Header action */}
      <div className='flex items-center justify-between'>
        <p className='text-muted-foreground text-sm'>
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
        </p>
        <CreatePlanForm>
          <Button>
            <Icons.add className='mr-2 h-4 w-4' />
            New Plan
          </Button>
        </CreatePlanForm>
      </div>

      {/* Plan grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className='flex flex-col items-center justify-center py-12'>
            <Icons.plan className='text-muted-foreground mb-3 h-10 w-10' />
            <p className='text-muted-foreground mb-4 text-sm'>
              No plans yet. Create your first research plan to get started.
            </p>
            <CreatePlanForm>
              <Button variant='outline'>
                <Icons.add className='mr-2 h-4 w-4' />
                Create Plan
              </Button>
            </CreatePlanForm>
          </CardContent>
        </Card>
      ) : (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {plans.map((plan) => (
            <Link key={plan.id} href={`/dashboard/plans/${plan.id}`}>
              <Card className='transition-shadow hover:shadow-md'>
                <CardHeader className='pb-3'>
                  <div className='flex items-start justify-between gap-2'>
                    <CardTitle className='text-base'>
                      {plan.researchGoal.slice(0, 60)}
                      {plan.researchGoal.length > 60 ? '…' : ''}
                    </CardTitle>
                    <Badge variant={statusVariant[plan.status]}>
                      {statusLabel[plan.status]}
                    </Badge>
                  </div>
                  <CardDescription>
                    Created {new Date(plan.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className='flex items-center gap-4 text-sm text-muted-foreground'>
                    <span className='flex items-center gap-1'>
                      <Icons.check className='h-4 w-4' />
                      {plan.objectives.length} objectives
                    </span>
                    <span className='flex items-center gap-1'>
                      <Icons.chat className='h-4 w-4' />
                      {plan.researchQuestions.length} questions
                    </span>
                    {plan.proposedSections.length > 0 && (
                      <span className='flex items-center gap-1'>
                        <Icons.forms className='h-4 w-4' />
                        {plan.proposedSections.length} sections
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
