'use client';

import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Icons } from '@/components/icons';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { surveysListQueryOptions } from '@/features/surveys/api/queries';
import type { SurveyListItem, SurveyStatus } from '@/features/surveys/api/types';
import { cn } from '@/lib/utils';

const STATUS_CONFIG: Record<
  SurveyStatus,
  { label: string; className: string }
> = {
  published: {
    label: 'Published',
    className:
      'border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary text-primary-foreground'
  },
  draft: {
    label: 'Draft',
    className: 'border-border bg-muted text-muted-foreground'
  },
  closed: {
    label: 'Closed',
    className: 'border-border bg-card text-foreground'
  },
  archived: {
    label: 'Archived',
    className: 'border-border bg-card text-muted-foreground'
  }
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
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function SurveyRow({ survey }: { survey: SurveyListItem }) {
  const status = STATUS_CONFIG[survey.status];

  return (
    <Link
      href={`/dashboard/surveys/${survey.id}/plan`}
      className='group flex items-start gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] hover:bg-brand-soft/50'
    >
      <div className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-mono text-[11px] font-bold tracking-wide text-primary ring-1 ring-[color-mix(in_srgb,var(--brand)_28%,transparent)]'>
        {initials(survey.title)}
      </div>
      <div className='min-w-0 flex-1'>
        <div className='flex items-start justify-between gap-2'>
          <p className='line-clamp-2 text-sm font-semibold leading-snug tracking-tight text-foreground'>
            {survey.title}
          </p>
          <Badge
            variant='secondary'
            className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
              status.className
            )}
          >
            {survey.status === 'published' ? (
              <Icons.circleCheck className='mr-1 size-3' />
            ) : null}
            {status.label}
          </Badge>
        </div>
        <div className='text-muted-foreground mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[11px] tabular-nums'>
          <span>
            {survey.responsesCount.toLocaleString()}{' '}
            {survey.responsesCount === 1 ? 'response' : 'responses'}
          </span>
          <span aria-hidden>·</span>
          <span>{relativeTime(survey.updatedAt)}</span>
        </div>
      </div>
      <Icons.chevronRight className='text-muted-foreground mt-1 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
    </Link>
  );
}

function SurveyRowSkeleton() {
  return (
    <div className='flex items-start gap-3 rounded-xl border border-border px-3 py-3'>
      <Skeleton className='size-10 rounded-xl' />
      <div className='min-w-0 flex-1 space-y-2'>
        <Skeleton className='h-4 w-3/4' />
        <Skeleton className='h-3 w-1/3' />
      </div>
      <Skeleton className='h-5 w-16 shrink-0 rounded-full' />
    </div>
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

  const subtitle = isLoading
    ? 'Loading surveys…'
    : recentSurveys.length === 0
      ? 'No activity yet'
      : `${recentSurveys.length} updated recently`;

  return (
    <SurvaiPanel className='flex h-full min-h-full flex-col'>
      <SurvaiPanelHeader
        icon={<Icons.survey className='size-3.5' />}
        title='Recent Surveys'
        subtitle={subtitle}
        badge={
          !isLoading && recentSurveys.length > 0 ? (
            <span className='rounded-full bg-card px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground ring-1 ring-border'>
              {recentSurveys.length}
            </span>
          ) : null
        }
        actions={
          <Link
            href='/dashboard/surveys'
            className='text-muted-foreground hover:text-foreground hidden text-xs font-medium underline-offset-4 hover:underline sm:inline'
          >
            View all
          </Link>
        }
      />
      <SurvaiPanelBody className='flex flex-1 flex-col gap-3 px-3 pt-3 pb-4 sm:px-4 sm:pb-5'>
        {isLoading ? (
          <div className='flex flex-1 flex-col gap-2'>
            {Array.from({ length: 4 }).map((_, i) => (
              <SurveyRowSkeleton key={i} />
            ))}
          </div>
        ) : recentSurveys.length === 0 ? (
          <div className='flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft/40 px-4 py-10 text-center'>
            <span className='mb-3 flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
              <Icons.survey className='size-5' />
            </span>
            <p className='font-display text-sm font-bold tracking-tight text-foreground'>
              No surveys yet
            </p>
            <p className='text-muted-foreground mt-1 max-w-[16rem] text-xs leading-relaxed'>
              Create your first survey to start collecting grounded responses.
            </p>
          </div>
        ) : (
          <>
            <div className='flex flex-1 flex-col gap-2'>
              {recentSurveys.map((survey) => (
                <SurveyRow key={survey.id} survey={survey} />
              ))}
            </div>
            <div className='mt-auto border-t border-border pt-3'>
              <Link
                href='/dashboard/surveys'
                className='inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90'
              >
                View all surveys
                <Icons.arrowRight className='size-4' />
              </Link>
            </div>
          </>
        )}
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
