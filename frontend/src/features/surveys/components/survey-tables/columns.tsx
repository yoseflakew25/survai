'use client';

import { useMemo } from 'react';
import type { Column, ColumnDef } from '@tanstack/react-table';
import { useLocale, useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { SurveyListItem, SurveyStatus } from '../../api/types';

const STATUS_ICONS: Record<
  SurveyStatus,
  typeof Icons.circleCheck
> = {
  published: Icons.circleCheck,
  draft: Icons.edit,
  closed: Icons.circleX,
  archived: Icons.eyeOff
};

const STATUS_CLASS: Record<SurveyStatus, string> = {
  published:
    'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground',
  draft: 'border-border bg-muted/70 text-muted-foreground',
  closed: 'border-border bg-card text-foreground',
  archived: 'border-border bg-muted/60 text-muted-foreground'
};

function surveyInitials(title: string) {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function useSurveyColumns(): ColumnDef<SurveyListItem>[] {
  const t = useTranslations('surveys');
  const tCommon = useTranslations('common');
  const locale = useLocale();

  return useMemo(() => {
    const statusLabel = (status: SurveyStatus) => {
      switch (status) {
        case 'published':
          return t('statusPublished');
        case 'draft':
          return t('statusDraft');
        case 'closed':
          return t('statusClosed');
        case 'archived':
          return t('statusArchived');
      }
    };

    const formatUpdatedAt = (iso: string) => {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return date.toLocaleDateString(locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
      if (diffDays === 0) return tCommon('today');
      if (diffDays === 1) return tCommon('yesterday');
      if (diffDays < 7) return tCommon('daysAgo', { count: diffDays });
      if (diffDays < 30) {
        return t('weeksAgo', { count: Math.floor(diffDays / 7) });
      }

      return date.toLocaleDateString(locale, {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    };

    return [
      {
        id: 'title',
        accessorKey: 'title',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colSurvey')} />
        ),
        cell: ({ row }) => {
          const survey = row.original;
          return (
            <div className='flex min-w-0 items-center gap-3'>
              <div
                className='bg-brand-soft text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold tracking-wide shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                aria-hidden
              >
                {surveyInitials(survey.title)}
              </div>
              <div className='min-w-0 max-w-[18rem] sm:max-w-[22rem] lg:max-w-[28rem]'>
                <div className='flex min-w-0 items-center gap-2'>
                  <p className='truncate text-sm font-semibold tracking-tight text-foreground group-hover/row:underline group-hover/row:decoration-foreground/25 group-hover/row:underline-offset-2'>
                    {survey.title}
                  </p>
                  {survey.waveLabel ? (
                    <Badge
                      variant='secondary'
                      className='shrink-0 capitalize text-[10px]'
                    >
                      {survey.waveLabel}
                    </Badge>
                  ) : null}
                </div>
                {survey.description ? (
                  <p className='text-muted-foreground truncate text-xs leading-snug'>
                    {survey.description}
                  </p>
                ) : (
                  <p className='text-muted-foreground/60 text-xs italic'>
                    {t('noDescription')}
                  </p>
                )}
              </div>
            </div>
          );
        },
        meta: {
          label: t('colSurvey'),
          placeholder: t('searchPlaceholder'),
          variant: 'text',
          icon: Icons.search
        },
        enableColumnFilter: true
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colStatus')} />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<SurveyStatus>();
          const StatusIcon = STATUS_ICONS[status];
          return (
            <Badge
              variant='outline'
              className={cn(
                'gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                STATUS_CLASS[status]
              )}
            >
              <StatusIcon className='size-3' />
              {statusLabel(status)}
            </Badge>
          );
        },
        meta: {
          label: t('colStatus'),
          variant: 'select',
          options: [
            {
              label: t('statusPublished'),
              value: 'published',
              icon: Icons.circleCheck
            },
            { label: t('statusDraft'), value: 'draft', icon: Icons.edit },
            { label: t('statusClosed'), value: 'closed', icon: Icons.circleX },
            {
              label: t('statusArchived'),
              value: 'archived',
              icon: Icons.eyeOff
            }
          ]
        },
        enableColumnFilter: true
      },
      {
        id: 'questionsCount',
        accessorKey: 'questionsCount',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colQuestions')} />
        ),
        cell: ({ cell }) => {
          const count = cell.getValue<number>();
          return (
            <span className='text-muted-foreground inline-flex items-center gap-1.5 font-mono text-sm tabular-nums'>
              <Icons.forms className='size-3.5 opacity-50' aria-hidden />
              {count}
            </span>
          );
        }
      },
      {
        id: 'responsesCount',
        accessorKey: 'responsesCount',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colResponses')} />
        ),
        cell: ({ cell }) => {
          const count = cell.getValue<number>();
          if (count === 0) {
            return (
              <span className='text-muted-foreground/70 font-mono text-sm tabular-nums'>
                —
              </span>
            );
          }
          return (
            <span className='font-mono text-sm font-semibold tabular-nums text-foreground'>
              {count.toLocaleString(locale)}
            </span>
          );
        }
      },
      {
        id: 'completionRate',
        accessorKey: 'completionRate',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colCompletion')} />
        ),
        cell: ({ cell }) => {
          const rate = cell.getValue<number | null>();
          if (rate === null) {
            return (
              <span className='text-muted-foreground/70 font-mono text-sm tabular-nums'>
                —
              </span>
            );
          }

          const display = Number.isInteger(rate)
            ? `${rate}%`
            : `${rate.toFixed(1)}%`;

          return (
            <div
              className='flex min-w-[7.5rem] items-center gap-2.5'
              title={t('completionTitle', { rate: display })}
            >
              <div className='bg-secondary h-2 w-20 overflow-hidden rounded-full'>
                <div
                  className='h-full rounded-full bg-brand transition-[width] duration-300'
                  style={{ width: `${Math.min(100, Math.max(0, rate))}%` }}
                />
              </div>
              <span className='text-muted-foreground w-10 font-mono text-xs tabular-nums'>
                {display}
              </span>
            </div>
          );
        }
      },
      {
        id: 'updatedAt',
        accessorKey: 'updatedAt',
        header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
          <DataTableColumnHeader column={column} title={t('colUpdated')} />
        ),
        cell: ({ cell }) => {
          const iso = cell.getValue<string>();
          const absolute = new Date(iso).toLocaleString(locale, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          });
          return (
            <span
              className='text-muted-foreground text-sm tabular-nums'
              title={absolute}
            >
              {formatUpdatedAt(iso)}
            </span>
          );
        }
      },
      {
        id: 'open',
        enableSorting: false,
        enableHiding: false,
        header: () => <span className='sr-only'>{tCommon('open')}</span>,
        cell: () => (
          <span className='text-muted-foreground flex justify-end opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100'>
            <Icons.chevronRight className='size-4' aria-hidden />
          </span>
        ),
        size: 40
      }
    ] satisfies ColumnDef<SurveyListItem>[];
  }, [t, tCommon, locale]);
}

/** Static fallback ids for URL sort parsers (must match useSurveyColumns). */
export const surveyColumnIds = [
  'title',
  'status',
  'questionsCount',
  'responsesCount',
  'completionRate',
  'updatedAt',
  'open'
] as const;
