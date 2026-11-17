'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  localizeActivityEyebrow,
  localizeActivityScript
} from '@/features/surveys/lib/localize-activity';

type SurveyActivityModalProps = {
  activityId: SurveyActivityId | null;
  open: boolean;
  previewText?: string;
};

/**
 * Non-dismissible activity modal — research-instrument aesthetic:
 * lime field, mono eyebrow, questionnaire-numbered stages.
 */
export function SurveyActivityModal({
  activityId,
  open,
  previewText
}: SurveyActivityModalProps) {
  const t = useTranslations('activity');
  const script = useMemo(() => {
    if (!activityId) return null;
    return localizeActivityScript(
      activityId,
      getActivityScript(activityId),
      t
    );
  }, [activityId, t]);
  const busy = open && !!script;
  const eyebrow = activityId
    ? localizeActivityEyebrow(activityId, t)
    : 'Survai';

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
