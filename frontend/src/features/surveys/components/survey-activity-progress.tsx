'use client';

import { useEffect, useState } from 'react';

import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ActivityStage } from '@/features/surveys/lib/activity-scripts';

export function useActivityStages(active: boolean, stages: ActivityStage[]) {
  const [stageIndex, setStageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!active || stages.length === 0) {
      setStageIndex(0);
      setProgress(0);
      return;
    }

    setStageIndex(0);
    setProgress(stages[0]?.progress ?? 0);

    const timers = stages.slice(1).map((stage, i) =>
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
  }, [active, stages]);

  return {
    stageIndex,
    progress: Math.min(99, Math.round(progress)),
    current: stages[stageIndex] ?? stages[0]
  };
}

type SurveyActivityProgressProps = {
  active: boolean;
  stages: ActivityStage[];
  intro?: string;
  footer?: string;
  previewLabel?: string;
  previewText?: string;
  className?: string;
  /** Hide intro copy when the parent already shows a brand hero. */
  hideIntro?: boolean;
  /** Editorial instrument look (modal) vs compact list (embedded dialogs). */
  variant?: 'instrument' | 'embedded';
};

/**
 * Staged progress — questionnaire-style numbered beats for the modal,
 * compact list when embedded in New Survey / create-plan.
 */
export function SurveyActivityProgress({
  active,
  stages,
  intro,
  footer,
  previewLabel = 'Context',
  previewText,
  className,
  hideIntro = false,
  variant = 'embedded'
}: SurveyActivityProgressProps) {
  const { stageIndex, progress, current } = useActivityStages(active, stages);

  if (variant === 'instrument') {
    return (
      <div
        className={cn('space-y-4', className)}
        role='status'
        aria-live='polite'
        aria-busy={active}
      >
        {previewText?.trim() ? (
          <div className='border-b border-foreground/10 pb-3'>
            <p className='font-mono text-[10px] font-semibold tracking-[0.14em] text-foreground/55 uppercase'>
              {previewLabel}
            </p>
            <p className='mt-1 line-clamp-2 text-sm leading-relaxed text-foreground/80'>
              {previewText.trim()}
            </p>
          </div>
        ) : null}

        <div className='flex items-baseline justify-between gap-3'>
          <p className='font-display text-[15px] font-bold tracking-tight text-foreground'>
            {current?.label ?? 'Working…'}
          </p>
          <p className='font-mono text-[11px] tabular-nums text-foreground/55'>
            {String(stageIndex + 1).padStart(2, '0')}
            <span className='mx-1 opacity-40'>/</span>
            {String(stages.length).padStart(2, '0')}
          </p>
        </div>

        <p className='text-foreground/65 -mt-2 text-xs leading-relaxed'>
          {current?.detail}
        </p>

        {/* Ink underline progress — research ledger, not a SaaS bar */}
        <div
          className='h-px w-full bg-foreground/10'
          aria-hidden
        >
          <div
            className='h-px bg-foreground transition-[width] duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>

        <ol className='divide-y divide-foreground/10'>
          {stages.map((stage, i) => {
            const done = i < stageIndex;
            const currentStage = i === stageIndex;
            const pending = i > stageIndex;
            const n = String(i + 1).padStart(2, '0');

            return (
              <li
                key={stage.id}
                className={cn(
                  'flex items-start gap-3 py-2.5 text-sm transition-colors duration-300',
                  pending && 'text-foreground/40'
                )}
              >
                <span
                  className={cn(
                    'mt-0.5 w-7 shrink-0 font-mono text-[11px] font-semibold tabular-nums tracking-wide',
                    currentStage && 'text-foreground',
                    done && 'text-foreground/45',
                    pending && 'text-foreground/30'
                  )}
                >
                  {n}
                </span>
                <span
                  className={cn(
                    'min-w-0 flex-1 leading-snug',
                    currentStage &&
                      'font-display font-bold tracking-tight text-foreground',
                    done && 'text-foreground/70'
                  )}
                >
                  {stage.label}
                </span>
                <span className='mt-0.5 flex size-4 shrink-0 items-center justify-center'>
                  {done ? (
                    <Icons.check
                      className='size-3.5 text-foreground/70'
                      strokeWidth={2.5}
                    />
                  ) : currentStage ? (
                    <span className='size-1.5 animate-pulse rounded-full bg-foreground' />
                  ) : (
                    <span className='size-1 rounded-full bg-foreground/25' />
                  )}
                </span>
              </li>
            );
          })}
        </ol>

        {footer ? (
          <p className='pt-1 text-center font-mono text-[10px] tracking-wide text-foreground/45 uppercase'>
            {footer}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-4', className)}
      role='status'
      aria-live='polite'
      aria-busy={active}
    >
      {!hideIntro && intro ? (
        <p className='text-muted-foreground text-sm leading-relaxed'>{intro}</p>
      ) : null}

      {previewText?.trim() ? (
        <div className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft/50 px-3.5 py-2.5'>
          <p className='text-[11px] font-semibold tracking-wide text-foreground/70 uppercase'>
            {previewLabel}
          </p>
          <p className='mt-1 line-clamp-3 text-sm leading-relaxed text-foreground'>
            {previewText.trim()}
          </p>
        </div>
      ) : null}

      <div>
        <div className='mb-2 flex items-center justify-between gap-2'>
          <span className='font-display text-sm font-bold tracking-tight text-foreground'>
            {current?.label ?? 'Working…'}
          </span>
          <span className='font-mono text-[11px] tabular-nums text-muted-foreground'>
            {progress}%
          </span>
        </div>
        <div className='bg-muted h-1.5 overflow-hidden rounded-full'>
          <div
            className='bg-primary h-full rounded-full transition-all duration-500 ease-out'
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className='text-muted-foreground mt-2 text-xs leading-relaxed'>
          {current?.detail}
        </p>
      </div>

      <ol className='space-y-0.5'>
        {stages.map((stage, i) => {
          const done = i < stageIndex;
          const currentStage = i === stageIndex;
          const pending = i > stageIndex;

          return (
            <li
              key={stage.id}
              className={cn(
                'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors',
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
            </li>
          );
        })}
      </ol>

      {footer ? (
        <p className='text-muted-foreground text-center text-xs'>{footer}</p>
      ) : null}
    </div>
  );
}
