import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Survey | Survey Copilot'
};

const MODULES = [
  {
    title: 'Build',
    description: 'Design sections and questions with AI assistance',
    icon: 'forms' as const,
    urlSuffix: 'build'
  },
  {
    title: 'Review',
    description: 'AI quality review with actionable findings',
    icon: 'review' as const,
    urlSuffix: 'review'
  },
  {
    title: 'Collect',
    description: 'Publish and share your survey with respondents',
    icon: 'collect' as const,
    urlSuffix: 'collect'
  },
  {
    title: 'Analytics',
    description: 'Explore response data with charts and cross-tabs',
    icon: 'analytics' as const,
    urlSuffix: 'analytics'
  },
  {
    title: 'Reports',
    description: 'Generate AI-grounded reports with export options',
    icon: 'report' as const,
    urlSuffix: 'reports'
  }
];

export default async function SurveyDetailPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <PageContainer
      pageTitle='Survey Workspace'
      pageDescription='Manage every phase of your survey lifecycle'
      pageHeaderAction={
        <Badge variant='secondary'>Draft</Badge>
      }
    >
      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-3'>
        {MODULES.map((mod) => {
          const Icon = Icons[mod.icon];
          return (
            <Link key={mod.urlSuffix} href={`/dashboard/surveys/${surveyId}/${mod.urlSuffix}`}>
              <Card className='transition-shadow hover:shadow-md'>
                <CardHeader>
                  <div className='flex items-center gap-3'>
                    <div className='bg-primary/10 flex size-10 items-center justify-center rounded-lg'>
                      <Icon className='text-primary size-5' />
                    </div>
                    <div>
                      <CardTitle className='text-base'>{mod.title}</CardTitle>
                      <CardDescription className='mt-0.5 text-xs'>
                        {mod.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
