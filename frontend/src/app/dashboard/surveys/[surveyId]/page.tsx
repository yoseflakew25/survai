import PageContainer from '@/components/layout/page-container';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Survey Workspace'
};

const MODULES = [
  {
    title: 'Plan',
    description: 'Research goal, objectives, and proposed sections',
    icon: 'plan' as const,
    urlSuffix: 'plan'
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
  },
  {
    title: 'Respondents',
    description: 'Browse individual submissions and completion status',
    icon: 'teams' as const,
    urlSuffix: 'respondents'
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
        <Badge
          variant='secondary'
          className='rounded-full border-transparent bg-secondary text-[10px]'
        >
          Draft
        </Badge>
      }
    >
      <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
        {MODULES.map((mod) => {
          const Icon = Icons[mod.icon];
          return (
            <Link
              key={mod.urlSuffix}
              href={`/dashboard/surveys/${surveyId}/${mod.urlSuffix}`}
              className='group rounded-2xl border border-border bg-card p-4 shadow-sm transition-[box-shadow,border-color] hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_22%,transparent)]'
            >
              <div className='flex items-start gap-3'>
                <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-foreground transition-colors group-hover:bg-brand'>
                  <Icon className='size-5' />
                </div>
                <div className='min-w-0'>
                  <p className='font-display text-base font-bold tracking-tight'>
                    {mod.title}
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                    {mod.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
