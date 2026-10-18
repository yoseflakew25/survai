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
      href={`/dashboard/surveys/${survey.id}`}
      className='flex items-center rounded-xl px-2.5 py-2.5 transition-colors hover:bg-muted/70'
    >
      <Avatar className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft'>
        <AvatarFallback className='rounded-xl bg-brand-soft text-xs font-semibold text-foreground'>
          {initials(survey.title)}
        </AvatarFallback>
      </Avatar>
      <div className='ml-3 min-w-0 flex-1 space-y-1'>
        <p className='truncate text-sm leading-none font-semibold tracking-tight'>
          {survey.title}
        </p>
        <div className='flex items-center gap-2'>
          <p className='font-mono text-[11px] text-muted-foreground'>
            {survey.responsesCount} responses
          </p>
          <span className='text-muted-foreground text-xs'>·</span>
          <p className='text-xs text-muted-foreground'>
            {relativeTime(survey.updatedAt)}
          </p>
        </div>
      </div>
      <Badge
        variant={status.variant}
        className={
          survey.status === 'published'
            ? 'ml-2 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-[10px] text-brand-foreground'
            : 'ml-2 shrink-0 rounded-full text-[10px]'
        }
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
    <Card className='h-full rounded-2xl border-border bg-card shadow-sm'>
      <CardHeader className='border-b border-border'>
        <CardTitle className='font-display text-lg font-bold tracking-tight'>
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
              <div key={i} className='flex items-center rounded-xl px-2.5 py-2.5'>
                <Skeleton className='size-9 rounded-xl' />
                <div className='ml-3 flex-1 space-y-1.5'>
                  <Skeleton className='h-3.5 w-2/3' />
                  <Skeleton className='h-3 w-1/3' />
                </div>
                <Skeleton className='ml-2 h-5 w-16 shrink-0 rounded-full' />
              </div>
            ))}
          </div>
        ) : recentSurveys.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-10 text-center'>
            <Icons.survey className='mb-3 h-10 w-10 text-muted-foreground' />
            <p className='text-sm text-muted-foreground'>
              No surveys yet. Create your first survey to get started.
            </p>
          </div>
        ) : (
          <>
            <div className='flex-1 space-y-0.5'>
              {recentSurveys.map((survey) => (
                <SurveyRow key={survey.id} survey={survey} />
              ))}
            </div>
            <div className='mt-4 border-t border-border pt-4'>
              <Link
                href='/dashboard/surveys'
                className='inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[filter,box-shadow] hover:brightness-105 hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_35%,transparent)]'
              >
                View all surveys
                <Icons.arrowRight className='size-4' />
              </Link>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
