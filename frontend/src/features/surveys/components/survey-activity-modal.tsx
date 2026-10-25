'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import { SurveyActivityProgress } from '@/features/surveys/components/survey-activity-progress';
import { SurveyActivitySpinner } from '@/features/surveys/components/survey-activity-spinner';
import {
  getActivityScript,
  type SurveyActivityId
} from '@/features/surveys/lib/activity-scripts';

type SurveyActivityModalProps = {
  activityId: SurveyActivityId | null;
  open: boolean;
  previewText?: string;
};

function activityEyebrow(id: SurveyActivityId): string {
  if (id.startsWith('fetch-')) {
    const page = id.replace('fetch-', '');
    return `Survai · ${page}`;
  }
  if (id.includes('report')) return 'Survai · Report';
  if (id.includes('review')) return 'Survai · Review';
  if (id.includes('publish')) return 'Survai · Collect';
  if (id.includes('plan')) return 'Survai · Plan';
  if (id.includes('survey')) return 'Survai · Instrument';
  return 'Survai · Workspace';
}

/**
 * Non-dismissible activity modal — research-instrument aesthetic:
 * lime field, mono eyebrow, questionnaire-numbered stages.
 */
export function SurveyActivityModal({
  activityId,
  open,
  previewText
}: SurveyActivityModalProps) {
  const script = activityId ? getActivityScript(activityId) : null;
  const busy = open && !!script;
  const eyebrow = activityId ? activityEyebrow(activityId) : 'Survai';

  return (
    <Dialog
      open={busy}
      onOpenChange={(next) => {
        if (!next && busy) return;
      }}
    >
      <DialogContent
        className='sm:max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0'
        showCloseButton={false}
      >
        {script ? (
          <div className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent),0_24px_48px_-24px_color-mix(in_srgb,var(--foreground)_40%,transparent)]'>
            <DialogTitle className='sr-only'>{script.title}</DialogTitle>

            {/* Grid wash — Launchpot / Survai signature, fades into the sheet */}
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
                <p className='mb-4 font-mono text-[10px] font-semibold tracking-[0.16em] text-foreground/60 uppercase'>
                  {eyebrow}
                </p>

                <SurveyActivitySpinner className='mb-4' />

                <h2 className='font-display text-[1.35rem] font-extrabold tracking-[-0.03em] text-foreground sm:text-xl'>
                  {script.title}
                </h2>
                <p className='mt-2 max-w-[20rem] text-sm leading-relaxed text-foreground/70'>
                  {script.intro}
                </p>
              </div>

              {/* Paper sheet — like answering a live instrument */}
              <div className='mt-6 rounded-xl border border-foreground/12 bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 py-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'>
                <SurveyActivityProgress
                  active={busy}
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
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
