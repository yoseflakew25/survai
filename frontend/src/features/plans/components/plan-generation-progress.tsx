'use client';

import { SurveyActivityProgress } from '@/features/surveys/components/survey-activity-progress';
import {
  PLAN_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';

export type PlanGenerationStage = ActivityStage;

export { PLAN_GENERATION_STAGES };

export function usePlanGenerationStages(active: boolean) {
  // Re-export shape for any legacy callers; progress body owns staging now.
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

/**
 * Body-only generation progress — nest inside the same Dialog shell as
 * other modals (`DialogHeader bg-primary` + padded content), or inside a
 * bordered card with a brand header (New Survey pattern).
 */
export function PlanGenerationProgress({
  active,
  goalPreview,
  className
}: PlanGenerationProgressProps) {
  return (
    <SurveyActivityProgress
      active={active}
      stages={PLAN_GENERATION_STAGES}
      intro='SurvAI is drafting objectives, research questions, audiences, and sections from your goal. This usually takes 10–20 seconds.'
      footer='Keep this open. You can edit every field after generation.'
      previewLabel='Research goal'
      previewText={goalPreview}
      className={className}
    />
  );
}
