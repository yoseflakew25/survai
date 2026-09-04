'use client';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { surveysListQueryOptions } from '@/features/surveys/api/queries';
import type { SurveyListItem, SurveyStatus } from '@/features/surveys/api/types';

const STATUS_CONFIG: Record<
  SurveyStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  published: { label: 'Published', variant: 'default' },
  draft: { label: 'Draft', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
  archived: { label: 'Archived', variant: 'outline' }
};

function relativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function initials(title: string): string {
  return title
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SurveyRow({ survey }: { survey: SurveyListItem }) {
  const status = STATUS_CONFIG[survey.status];
  return (
    <Link
      key={survey.id}
      href={`/dashboard/surveys/${survey.id}`}
      className='flex items-center rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/50'
    >
      <Avatar className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10'>
        <AvatarFallback className='text-primary text-xs font-medium'>
          {initials(survey.title)}
        </AvatarFallback>
      </Avatar>
      <div className='ml-4 min-w-0 flex-1 space-y-1'>
        <p className='truncate text-sm leading-none font-medium'>
          {survey.title}
        </p>
        <div className='flex items-center gap-2'>
          <p className='text-muted-foreground text-xs'>
            {survey.responsesCount} responses
          </p>
          <span className='text-muted-foreground text-xs'>·</span>
          <p className='text-muted-foreground text-xs'>
            {relativeTime(survey.updatedAt)}
          </p>
        </div>
      </div>
      <Badge
        variant={status.variant}
        className='ml-2 shrink-0 text-[10px]'
      >
        {survey.status === 'published' && (
          <Icons.circleCheck className='mr-1 h-3 w-3' />
        )}
        {status.label}
      </Badge>
    </Link>
  );
}

export function RecentSurveys() {
  const { data, isLoading } = useQuery(surveysListQueryOptions({}));
  const recentSurveys = (data?.surveys ?? [])
    .slice()
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    .slice(0, 5);

  return (
    <Card className='h-full border'>
      <CardHeader className='border-b'>
        <CardTitle className='text-primary font-semibold text-lg'>
          Recent Surveys
        </CardTitle>
        <CardDescription>
          {isLoading
            ? 'Loading surveys...'
            : `${recentSurveys.length} ${
                recentSurveys.length === 1 ? 'survey' : 'surveys'
              } updated recently`}
        </CardDescription>
      </CardHeader>
      <CardContent className='flex flex-col'>
        {isLoading ? (
          <div className='flex-1 space-y-1'>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className='flex items-center rounded-lg px-2 py-2.5'
              >
                <Skeleton className='size-9 rounded-lg' />
                <div className='ml-4 flex-1 space-y-1.5'>
                  <Skeleton className='h-3.5 w-2/3' />
                  <Skeleton className='h-3 w-1/3' />
                </div>
                <Skeleton className='ml-2 h-5 w-16 shrink-0' />
              </div>
            ))}
          </div>
        ) : recentSurveys.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 text-center'>
            <Icons.survey className='text-muted-foreground mb-3 h-10 w-10' />
            <p className='text-muted-foreground text-sm'>
              No surveys yet. Create your first survey to get started.
            </p>
          </div>
        ) : (
          <>
            <div className='flex-1 space-y-1'>
              {recentSurveys.map((survey) => (
                <SurveyRow key={survey.id} survey={survey} />
              ))}
            </div>
            <div className='mt-4 border-t pt-4'>
              <Link
                href='/dashboard/surveys'
                className='inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90'
              >
                View All Surveys
                <Icons.arrowRight className='ml-2 size-4' />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}