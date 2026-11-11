'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import { SurveyActivityCard } from '@/features/surveys/components/survey-activity-card';
import {
  getActivityScript,
  type SurveyActivityId
} from '@/features/surveys/lib/activity-scripts';

type SurveyActivityModalProps = {
  activityId: SurveyActivityId | null;
  open: boolean;
  previewText?: string;
};

export function activityEyebrow(id: SurveyActivityId): string {
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
          <>
            <DialogTitle className='sr-only'>{script.title}</DialogTitle>
            <SurveyActivityCard
              script={script}
              active={busy}
              eyebrow={eyebrow}
              previewText={previewText}
            />
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
