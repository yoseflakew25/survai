import { redirect } from 'next/navigation';

/** No workspace hub — land on Plan (first workflow step). */
export default async function SurveyDetailPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  redirect(`/dashboard/surveys/${surveyId}/plan`);
}
