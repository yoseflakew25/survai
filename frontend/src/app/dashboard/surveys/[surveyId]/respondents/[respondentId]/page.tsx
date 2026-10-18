import { redirect } from 'next/navigation';

/** Legacy full-page detail → list with half-width drawer open. */
export default async function RespondentDetailPage({
  params
}: {
  params: Promise<{ surveyId: string; respondentId: string }>;
}) {
  const { surveyId, respondentId } = await params;
  redirect(
    `/dashboard/surveys/${surveyId}/respondents?respondent=${encodeURIComponent(respondentId)}`
  );
}
