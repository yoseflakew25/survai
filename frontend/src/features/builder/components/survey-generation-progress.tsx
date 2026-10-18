'use client';

import { useEffect, useState } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

export type SurveyGenerationStage = {
  id: string;
  label: string;
  detail: string;
  progress: number;
  afterMs: number;
};

/** Staged copy for the Gemini builder round-trip (UX pacing, not real server steps). */
export const SURVEY_GENERATION_STAGES: SurveyGenerationStage[] = [
  {
    id: 'plan',
    label: 'Reading your research plan',
    detail: 'Loading objectives, audiences, and proposed sections…',
    progress: 8,
    afterMs: 0
  },
  {
    id: 'structure',
    label: 'Structuring the questionnaire',
    detail: 'Turning proposed sections into a clear survey flow…',
    progress: 22,
    afterMs: 2000
  },
  {
    id: 'demographics',
    label: 'Drafting opening questions',
    detail: 'Writing demographics and screening items…',
    progress: 40,
    afterMs: 4500
  },
  {
    id: 'core',
    label: 'Writing core questions',
    detail: 'Aligning question types with your research objectives…',
    progress: 58,
    afterMs: 7500
  },
  {
    id: 'choices',
    label: 'Building answer options',
    detail: 'Adding choices, scales, and help text where needed…',
    progress: 76,
    afterMs: 10500
  },
  {
    id: 'finalize',
    label: 'Polishing the draft',
    detail: 'Checking wording, required fields, and section order…',
    progress: 90,
    afterMs: 14000
  }
];

export function useSurveyGenerationStages(active: boolean) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active) {
      setStageIndex(0);
      setProgress(0);
      return;
    }

    setStageIndex(0);
    setProgress(SURVEY_GENERATION_STAGES[0]?.progress ?? 0);

    const timers = SURVEY_GENERATION_STAGES.slice(1).map((stage, i) =>
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
    stages: SURVEY_GENERATION_STAGES,
    current: SURVEY_GENERATION_STAGES[stageIndex] ?? SURVEY_GENERATION_STAGES[0]
  };
}

type SurveyGenerationProgressProps = {
  active: boolean;
  goalPreview?: string;
  className?: string;
};

/**
 * Body-only builder progress — nest in `DialogHeader bg-primary` + padded content
 * (same shell as plan generation).
 */
export function SurveyGenerationProgress({
  active,
  goalPreview,
  className
}: SurveyGenerationProgressProps) {
  const { stageIndex, progress, stages, current } =
    useSurveyGenerationStages(active);

  return (
    <div
      className={cn('space-y-4', className)}
      role='status'
      aria-live='polite'
      aria-busy={active}
    >
      <p className='text-muted-foreground text-sm leading-relaxed'>
        SurvAI is drafting survey sections and questions from your plan. This
        usually takes 15–30 seconds.
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
        Keep this open. You can edit every question after generation.
      </p>
    </div>
  );
}
