'use client';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useActivityStages } from '@/features/surveys/components/survey-activity-progress';
import {
  PLAN_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';

export type PlanGenerationStage = ActivityStage;

export { PLAN_GENERATION_STAGES };

export function usePlanGenerationStages(active: boolean) {
  void active;
  return {
    stageIndex: 0,
    progress: 0,
    stages: PLAN_GENERATION_STAGES,
    current: PLAN_GENERATION_STAGES[0]
  };
}

type PlanGenerationProgressProps = {
  active: boolean;
  goalPreview?: string;
  className?: string;
  /** @deprecated unused — kept for callers */
  compact?: boolean;
};

/**
 * Full generating panel for the plan interview — header, goal, progress, stages.
 */
export function PlanGenerationProgress({
  active,
  goalPreview,
  className
}: PlanGenerationProgressProps) {
  const { stageIndex, progress, current } = useActivityStages(
    active,
    PLAN_GENERATION_STAGES
  );

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-card',
        className
      )}
      role='status'
      aria-live='polite'
      aria-busy={active}
    >
      <div className='border-b border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft px-5 py-5 sm:px-7 sm:py-6'>
        <div className='flex items-start justify-between gap-4'>
          <div className='min-w-0'>
            <p className='font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl'>
              Generating survey plan
            </p>
            <p className='text-muted-foreground .5 text-sm leading-relaxed'>
              Drafting from your research goal — usually 10–20 seconds.
            </p>
          </div>
          <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground'>
            <Icons.spinner className='size-4 animate-spin' />
          </div>
        </div>

        <div className='mt-2'>
          <div className='mb-2 flex items-baseline justify-between gap-3'>
            <p className='truncate text-sm font-semibold text-foreground'>
              {current?.label ?? 'Working…'}
            </p>
            <p className='font-mono text-xs font-semibold tabular-nums text-primary'>
              {progress}%
            </p>
          </div>
          <div className='bg-card h-2 overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full transition-[width] duration-500 ease-out'
              style={{ width: `${progress}%` }}
            />
          </div>
          {/* {current?.detail ? (
            <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
              {current.detail}
            </p>
          ) : null} */}
        </div>
      </div>

      <div className='space-y-5 px-5 py-5 sm:px-7 sm:py-6'>
        {goalPreview?.trim() ? (
          <div className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft/60 px-4 py-3.5'>
            <p className='text-[10px] font-semibold tracking-wide text-primary uppercase'>
              Research goal
            </p>
            <p className='.5 text-sm leading-relaxed text-foreground'>
              {goalPreview.trim()}
            </p>
          </div>
        ) : null}

        <ol className='space-y-1'>
          {PLAN_GENERATION_STAGES.map((stage, i) => {
            const done = i < stageIndex;
            const currentStage = i === stageIndex;
            const pending = i > stageIndex;

            return (
              <li
                key={stage.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                  currentStage &&
                    'bg-brand-soft text-foreground ring-1 ring-[color-mix(in_srgb,var(--brand)_30%,transparent)]',
                  done && 'text-foreground',
                  pending && 'text-muted-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex size-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-bold tabular-nums',
                    currentStage && 'bg-primary text-primary-foreground',
                    done && 'bg-primary/15 text-primary',
                    pending && 'bg-muted text-muted-foreground'
                  )}
                >
                  {done ? (
                    <Icons.check className='size-3.5' strokeWidth={2.5} />
                  ) : currentStage ? (
                    <Icons.spinner className='size-3.5 animate-spin' />
                  ) : (
                    i + 1
                  )}
                </div>
                <span
                  className={cn(
                    'min-w-0 flex-1 leading-snug',
                    currentStage && 'font-semibold'
                  )}
                >
                  {stage.label}
                </span>
              </li>
            );
          })}
        </ol>

        <p className='text-muted-foreground text-center text-xs leading-relaxed'>
          Keep this open. You can edit every field after generation.
        </p>
      </div>
    </div>
  );
}
