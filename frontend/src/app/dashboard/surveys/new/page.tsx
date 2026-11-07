import { Metadata } from 'next';

import { PlanGeneratorWorkspace } from '@/features/plans/components/plan-generator-workspace';

export const metadata: Metadata = {
  title: 'New Survey Plan',
  description: 'Chat with SurvAI to shape a research goal and generate a survey plan'
};

export default function NewSurveyPlanPage() {
  return (
    <div className='flex h-[calc(100dvh-4rem)] w-full min-h-0 flex-1 flex-col overflow-hidden px-4 pt-2 pb-4 md:h-[calc(100dvh-3.5rem)] md:px-6 md:pt-4'>
      <PlanGeneratorWorkspace />
    </div>
  );
}
