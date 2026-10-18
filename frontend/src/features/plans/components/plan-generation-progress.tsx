'use client';

import { useEffect, useState } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type PlanGenerationStage = {
  id: string;
  label: string;
  detail: string;
  progress: number;
  afterMs: number;
};

/** Staged copy for the single Gemini round-trip (UX pacing, not real server steps). */
export const PLAN_GENERATION_STAGES: PlanGenerationStage[] = [
  {
    id: 'analyze',
    label: 'Reading your research goal',
    detail: 'Parsing intent, scope, and who this survey is for…',
    progress: 8,
    afterMs: 0
  },
  {
    id: 'objectives',
    label: 'Drafting research objectives',
    detail: 'Turning the goal into clear, measurable outcomes…',
    progress: 22,
    afterMs: 1800
  },
  {
    id: 'questions',
    label: 'Shaping research questions',
    detail: 'Deciding what the survey must be able to answer…',
    progress: 40,
    afterMs: 4200
  },
  {
    id: 'respondents',
    label: 'Identifying target respondents',
    detail: 'Choosing who should take the survey and why…',
    progress: 58,
    afterMs: 7000
  },
  {
    id: 'sections',
    label: 'Designing survey sections',
    detail: 'Building a logical flow of topics and rationale…',
    progress: 76,
    afterMs: 10000
  },
  {
    id: 'finalize',
    label: 'Polishing the plan',
    detail: 'Estimating length and checking consistency…',
    progress: 90,
    afterMs: 13500
  }
];

export function usePlanGenerationStages(active: boolean) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      setProgress(0);
      return;
    }

    setStageIndex(0);
    setProgress(PLAN_GENERATION_STAGES[0]?.progress ?? 0);

    const timers = PLAN_GENERATION_STAGES.slice(1).map((stage, i) =>
      window.setTimeout(() => {
        setStageIndex(i + 1);
        setProgress(stage.progress);
      }, stage.afterMs)
    );

    const crawl = window.setInterval(() => {
      setProgress((p) => (p < 96 ? Math.min(96, p + 0.35) : p));
    }, 400);

    return () => {
      timers.forEach(clearTimeout);
      clearInterval(crawl);
    };
  }, [active]);

  return {
    stageIndex,
    progress: Math.min(99, Math.round(progress)),
    stages: PLAN_GENERATION_STAGES,
    current: PLAN_GENERATION_STAGES[stageIndex] ?? PLAN_GENERATION_STAGES[0]
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
 * Body-only generation progress — nest inside the same Dialog shell as
 * other modals (`DialogHeader bg-primary` + padded content), or inside a
 * bordered card with a brand header (New Survey pattern).
 */
export function PlanGenerationProgress({
  active,
  goalPreview,
  className
}: PlanGenerationProgressProps) {
  const { stageIndex, progress, stages, current } = usePlanGenerationStages(active);

  return (
    <div
      className={cn('space-y-4', className)}
      role='status'
      aria-live='polite'
      aria-busy={active}
    >
      <p className='text-muted-foreground text-sm leading-relaxed'>
        SurvAI is drafting objectives, research questions, audiences, and
        sections from your goal. This usually takes 10–20 seconds.
      </p>

      {goalPreview?.trim() ? (
        <div className='border-border bg-muted/40 rounded-xl border px-3.5 py-2.5'>
          <p className='text-muted-foreground text-[11px] font-medium'>
            Research goal
          </p>
          <p className='text-foreground mt-1 line-clamp-3 text-sm leading-relaxed'>
            {goalPreview.trim()}
          </p>
        </div>
      ) : null}

      <div>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <span className='text-foreground text-sm font-medium'>
            {current?.label ?? 'Generating…'}
          </span>
          <span className='text-muted-foreground text-sm tabular-nums'>
            {progress}%
          </span>
        </div>
        <div className='bg-muted h-2 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
          {current?.detail}
        </p>
      </div>

      <div className='space-y-1'>
        {stages.map((stage, i) => {
          const done = i < stageIndex;
          const currentStage = i === stageIndex;
          const pending = i > stageIndex;

          return (
            <div
              key={stage.id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                currentStage && 'bg-primary/10 text-foreground',
                done && 'text-foreground',
                pending && 'text-muted-foreground'
              )}
            >
              <div
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full',
                  currentStage && 'bg-primary text-primary-foreground',
                  done && 'bg-primary/15 text-primary',
                  pending && 'bg-muted text-muted-foreground'
                )}
              >
                {done ? (
                  <Icons.check className='size-3.5' />
                ) : currentStage ? (
                  <Icons.spinner className='size-3.5 animate-spin' />
                ) : (
                  <span className='text-[10px] font-semibold tabular-nums'>
                    {i + 1}
                  </span>
                )}
              </div>
              <span className={cn('flex-1', currentStage && 'font-medium')}>
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className='text-muted-foreground text-center text-xs'>
        Keep this open. You can edit every field after generation.
      </p>
    </div>
  );
}
