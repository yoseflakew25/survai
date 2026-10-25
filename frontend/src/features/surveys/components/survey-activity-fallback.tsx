'use client';

import { SurveyActivityModal } from '@/features/surveys/components/survey-activity-modal';
import type { SurveyActivityId } from '@/features/surveys/lib/activity-scripts';

type SurveyActivityFallbackProps = {
  activity: Extract<
    SurveyActivityId,
    | 'fetch-plan'
    | 'fetch-review'
    | 'fetch-collect'
    | 'fetch-respondents'
    | 'fetch-analytics'
    | 'fetch-report'
  >;
};

/**
 * Suspense / AuthQueryBoundary fallback — shows the activity modal while
 * page data loads. Pill nav stays visible from the survey layout.
 */
export function SurveyActivityFallback({
  activity
}: SurveyActivityFallbackProps) {
  return (
    <div className='relative min-h-[50vh]' aria-busy='true'>
      <SurveyActivityModal activityId={activity} open />
    </div>
  );
}
