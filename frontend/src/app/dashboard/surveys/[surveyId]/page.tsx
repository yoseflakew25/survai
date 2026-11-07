import { redirect } from 'next/navigation';

/** No workspace hub — land on Review (questionnaire). */
export default async function SurveyDetailPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  redirect(`/dashboard/surveys/${surveyId}/review`);
}
