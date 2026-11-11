'use client';

import { SurveyActivityCard } from '@/features/surveys/components/survey-activity-card';
import {
  getActivityScript,
  PLAN_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';

export type PlanGenerationStage = ActivityStage;

export { PLAN_GENERATION_STAGES };

export function usePlanGenerationStages(active: boolean) {
  void active;
  return {
    stageIndex: 0,
    progress: 0,
    stages: PLAN_GENERATION_STAGES,
    current: PLAN_GENERATION_STAGES[0]
  };
}

type PlanGenerationProgressProps = {
  active: boolean;
  goalPreview?: string;
  className?: string;
  /** @deprecated unused — kept for callers */
  compact?: boolean;
};

const SCRIPT = getActivityScript('generate-plan');

/**
 * Same instrument loading card as publish / generate questions.
 */
export function PlanGenerationProgress({
  active,
  goalPreview,
  className
}: PlanGenerationProgressProps) {
  return (
    <SurveyActivityCard
      script={SCRIPT}
      active={active}
      eyebrow='Survai · Plan'
      previewText={goalPreview}
      className={className}
    />
  );
}
