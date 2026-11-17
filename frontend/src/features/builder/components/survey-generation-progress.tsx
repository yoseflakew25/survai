'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SurveyActivityCard } from '@/features/surveys/components/survey-activity-card';
import {
  getActivityScript,
  SURVEY_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';
import {
  localizeActivityEyebrow,
  localizeActivityScript
} from '@/features/surveys/lib/localize-activity';

export type SurveyGenerationStage = ActivityStage;

export { SURVEY_GENERATION_STAGES };

export function useSurveyGenerationStages(active: boolean) {
  void active;
  return {
    stageIndex: 0,
    progress: 0,
    stages: SURVEY_GENERATION_STAGES,
    current: SURVEY_GENERATION_STAGES[0]
  };
}

type SurveyGenerationProgressProps = {
  active: boolean;
  goalPreview?: string;
  className?: string;
};

/**
 * Same instrument loading card as publish / generate plan.
 */
export function SurveyGenerationProgress({
  active,
  goalPreview,
  className
}: SurveyGenerationProgressProps) {
  const t = useTranslations('activity');
  const script = useMemo(
    () =>
      localizeActivityScript(
        'generate-survey',
        getActivityScript('generate-survey'),
        t
      ),
    [t]
  );

  return (
    <SurveyActivityCard
      script={script}
      active={active}
      eyebrow={localizeActivityEyebrow('generate-survey', t)}
      previewText={goalPreview}
      className={className}
    />
  );
}
