import { SurveyPillNav } from '@/features/surveys/components/survey-pill-nav';
import { SurveyWorkspaceShell } from '@/features/surveys/components/survey-workspace-shell';

export default async function SurveyIdLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <SurveyWorkspaceShell>
      <div className='flex flex-1 flex-col'>
        <div className='sticky top-16 z-10 border-b border-border/60 bg-white px-4 py-2.5 md:top-14 md:px-6 md:py-3 dark:bg-card'>
          <SurveyPillNav surveyId={surveyId} />
        </div>
        {children}
      </div>
    </SurveyWorkspaceShell>
  );
}
