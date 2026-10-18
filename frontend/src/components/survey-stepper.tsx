'use client';

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export const SURVEY_FLOW_STEPS = [
  { label: 'Plan Created' },
  { label: 'Plan Approved' },
  { label: 'Review Survey' },
  { label: 'Collect' },
  { label: 'Analytics' },
  { label: 'Report' }
] as const;

export interface SurveyStepperProps {
  /** 1-based index of the current step in the workflow */
  currentStep: number;
  /** Optional element rendered on the right, e.g. a status badge */
  badge?: ReactNode;
}

export function SurveyStepper({ currentStep, badge }: SurveyStepperProps) {
  return (
    <div className='rounded-2xl border border-border bg-card px-4 py-2.5 shadow-sm'>
      <div className='flex items-center justify-between gap-x-4'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          {SURVEY_FLOW_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isCurrent = stepNumber === currentStep;
            const isUpcoming = stepNumber > currentStep;
            return (
              <Fragment key={step.label}>
                {index > 0 ? (
                  <Icons.chevronsRight className='text-muted-foreground h-3 w-3' />
                ) : null}
                <div className='flex items-center gap-1.5'>
                  <span
                    className={cn(
                      'flex size-5 items-center justify-center rounded-full text-[10px] font-bold',
                      isUpcoming && 'bg-muted text-muted-foreground',
                      isCompleted && 'bg-foreground text-background',
                      isCurrent &&
                        'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
                    )}
                  >
                    {isCompleted ? (
                      <Icons.check className='size-3' />
                    ) : (
                      stepNumber
                    )}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      isUpcoming && 'text-muted-foreground',
                      isCurrent && 'font-semibold text-foreground',
                      isCompleted && 'font-medium text-foreground'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              </Fragment>
            );
          })}
        </div>
        {badge}
      </div>
    </div>
  );
}
