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
        <div className='survey-workspace-subnav sticky z-10 border-b px-4 py-2.5 md:px-6 md:py-3'>
          <SurveyPillNav surveyId={surveyId} />
        </div>
        {children}
      </div>
    </SurveyWorkspaceShell>
  );
}
