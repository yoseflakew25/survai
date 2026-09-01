import { RecentSurveys } from '@/features/overview/components/recent-surveys';

export default async function RecentSurveysPage() {
  // Simulate loading delay for demo
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return <RecentSurveys />;
}
