'use client';

import { SurveyActivityProgress } from '@/features/surveys/components/survey-activity-progress';
import {
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

/**
 * Body-only builder progress — nest in `DialogHeader bg-primary` + padded content
 * (same shell as plan generation).
 */
export function SurveyGenerationProgress({
  active,
  goalPreview,
  className
}: SurveyGenerationProgressProps) {
  return (
    <SurveyActivityProgress
      active={active}
      stages={SURVEY_GENERATION_STAGES}
      intro='SurvAI is drafting survey sections and questions from your plan. This usually takes 15–30 seconds.'
      footer='Keep this open. You can edit every question after generation.'
      previewLabel='Research goal'
      previewText={goalPreview}
      className={className}
    />
  );
}
