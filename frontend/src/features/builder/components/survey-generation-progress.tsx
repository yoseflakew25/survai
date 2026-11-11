'use client';

import { SurveyActivityCard } from '@/features/surveys/components/survey-activity-card';
import {
  getActivityScript,
  SURVEY_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';

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

const SCRIPT = getActivityScript('generate-survey');

/**
 * Same instrument loading card as publish / generate plan.
 */
export function SurveyGenerationProgress({
  active,
  goalPreview,
  className
}: SurveyGenerationProgressProps) {
  return (
    <SurveyActivityCard
      script={SCRIPT}
      active={active}
      eyebrow='Survai · Instrument'
      previewText={goalPreview}
      className={className}
    />
  );
}
