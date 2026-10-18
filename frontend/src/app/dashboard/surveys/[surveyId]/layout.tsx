import { SurveyPillNav } from '@/features/surveys/components/survey-pill-nav';

export default async function SurveyIdLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <div className='flex flex-1 flex-col'>
      <div className='px-4 pt-2 md:px-6 md:pt-4'>
        <SurveyPillNav surveyId={surveyId} />
      </div>
      {children}
    </div>
  );
}
