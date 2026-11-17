'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { SurveyActivityCard } from '@/features/surveys/components/survey-activity-card';
import {
  getActivityScript,
  PLAN_GENERATION_STAGES,
  type ActivityStage
} from '@/features/surveys/lib/activity-scripts';
import {
  localizeActivityEyebrow,
  localizeActivityScript
} from '@/features/surveys/lib/localize-activity';

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

/**
 * Same instrument loading card as publish / generate questions.
 */
export function PlanGenerationProgress({
  active,
  goalPreview,
  className
}: PlanGenerationProgressProps) {
  const t = useTranslations('activity');
  const script = useMemo(
    () =>
      localizeActivityScript(
        'generate-plan',
        getActivityScript('generate-plan'),
        t
      ),
    [t]
  );

  return (
    <SurveyActivityCard
      script={script}
      active={active}
      eyebrow={localizeActivityEyebrow('generate-plan', t)}
      previewText={goalPreview}
      className={className}
    />
  );
}
