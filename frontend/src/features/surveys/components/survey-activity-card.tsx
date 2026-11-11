'use client';

import { SurveyActivityProgress } from '@/features/surveys/components/survey-activity-progress';
import { SurveyActivitySpinner } from '@/features/surveys/components/survey-activity-spinner';
import type { SurveyActivityScript } from '@/features/surveys/lib/activity-scripts';
import { cn } from '@/lib/utils';

type SurveyActivityCardProps = {
  script: SurveyActivityScript;
  active: boolean;
  eyebrow: string;
  previewText?: string;
  className?: string;
};

/**
 * Shared loading card — lime field + instrument sheet (publish, generate plan/questions).
 */
export function SurveyActivityCard({
  script,
  active,
  eyebrow,
  previewText,
  className
}: SurveyActivityCardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent),0_24px_48px_-24px_color-mix(in_srgb,var(--foreground)_40%,transparent)]',
        className
      )}
      role='status'
      aria-live='polite'
      aria-busy={active}
    >
      <div
        className='pointer-events-none absolute inset-0 opacity-[0.32]'
        aria-hidden
        style={{
          backgroundImage:
            'linear-gradient(to right, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 9%, transparent) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage:
            'linear-gradient(to bottom, black 0%, black 28%, transparent 62%)',
          WebkitMaskImage:
            'linear-gradient(to bottom, black 0%, black 28%, transparent 62%)'
        }}
      />

      <div className='relative px-5 pt-6 pb-5 sm:px-6'>
        <div className='flex flex-col items-center text-center'>
          <p className='mb-4 font-mono text-[10px] font-semibold tracking-[0.16em] text-brand-foreground/70 uppercase'>
            {eyebrow}
          </p>

          <SurveyActivitySpinner className='mb-4' />

          <h2 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-brand-foreground sm:text-3xl'>
            {script.title}
          </h2>
          <p className='mt-2 max-w-[20rem] text-sm leading-relaxed text-brand-foreground/80'>
            {script.intro}
          </p>
        </div>

        <div className='mt-6 rounded-xl border border-foreground/12 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 py-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'>
          <SurveyActivityProgress
            active={active}
            stages={script.stages}
            intro={script.intro}
            footer={script.footer}
            previewLabel={script.previewLabel}
            previewText={previewText}
            hideIntro
            variant='instrument'
          />
        </div>
      </div>
    </div>
  );
}
