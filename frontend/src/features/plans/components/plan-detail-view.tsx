'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { planByIdOptions } from '../api/queries';
import { PlanEditor } from './plan-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { notFound } from 'next/navigation';

interface PlanDetailViewProps {
  planId: string;
}

export function PlanDetailView({ planId }: PlanDetailViewProps) {
  return (
    <PlanDetailContent planId={planId} />
  );
}

function PlanDetailContent({ planId }: { planId: string }) {
  const { data: plan, refetch } = useSuspenseQuery(planByIdOptions(planId));

  if (!plan) {
    notFound();
  }

  return (
    <PlanEditor
      plan={plan}
      onPlanUpdate={() => {
        // Refetch to stay in sync
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
