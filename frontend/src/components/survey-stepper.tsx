'use client';

import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

// ============================================================
// Survey Workflow Stepper — shared across the survey module
// pages (Review → Collect → Analytics → Reports) so every
// page renders the same compact, consistent progress flow.
// ============================================================

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
    <div className='rounded-lg border bg-background px-4 py-2.5'>
      <div className='flex items-center justify-between gap-x-4'>
        <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
          {SURVEY_FLOW_STEPS.map((step, index) => {
            const stepNumber = index + 1;
            const isCompleted = stepNumber < currentStep;
            const isUpcoming = stepNumber > currentStep;
            return (
              <Fragment key={step.label}>
                {index > 0 && (
                  <Icons.chevronsRight className='text-muted-foreground h-3 w-3' />
                )}
                <div className='flex items-center gap-1.5'>
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      isUpcoming
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-primary text-primary-foreground'
                    )}
                  >
                    {isCompleted ? '✓' : stepNumber}
                  </span>
                  <span
                    className={cn(
                      'text-xs',
                      isUpcoming ? 'text-muted-foreground' : 'font-medium'
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