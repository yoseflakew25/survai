'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { SurveyListItem, SurveyStatus } from '../../api/types';

const STATUS_CONFIG: Record<
  SurveyStatus,
  {
    label: string;
    className: string;
    icon: typeof Icons.circleCheck;
  }
> = {
  published: {
    label: 'Published',
    className:
      'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground',
    icon: Icons.circleCheck
  },
  draft: {
    label: 'Draft',
    className: 'border-border bg-muted/70 text-muted-foreground',
    icon: Icons.edit
  },
  closed: {
    label: 'Closed',
    className: 'border-border bg-card text-foreground',
    icon: Icons.circleX
  },
  archived: {
    label: 'Archived',
    className:
      'border-[color-mix(in_srgb,var(--gold)_40%,var(--border))] bg-[color-mix(in_srgb,var(--gold)_16%,var(--card))] text-foreground',
    icon: Icons.eyeOff
  }
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

function formatUpdatedAt(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}

export const columns: ColumnDef<SurveyListItem>[] = [
  {
    id: 'title',
    accessorKey: 'title',
    header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
      <DataTableColumnHeader column={column} title='Survey' />
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
            <p className='truncate text-sm font-semibold tracking-tight text-foreground group-hover/row:underline group-hover/row:decoration-foreground/25 group-hover/row:underline-offset-2'>
              {survey.title}
            </p>
            {survey.description ? (
              <p className='text-muted-foreground mt-0.5 truncate text-xs leading-snug'>
                {survey.description}
              </p>
            ) : (
              <p className='text-muted-foreground/60 mt-0.5 text-xs italic'>
                No description
              </p>
            )}
          </div>
        </div>
      );
    },
    meta: {
      label: 'Survey',
      placeholder: 'Search surveys...',
      variant: 'text',
      icon: Icons.search
    },
    enableColumnFilter: true
  },
  {
    id: 'status',
    accessorKey: 'status',
    header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<SurveyStatus>();
      const config = STATUS_CONFIG[status];
      const StatusIcon = config.icon;
      return (
        <Badge
          variant='outline'
          className={cn(
            'gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
            config.className
          )}
        >
          <StatusIcon className='size-3' />
          {config.label}
        </Badge>
      );
    },
    meta: {
      label: 'Status',
      variant: 'select',
      options: [
        { label: 'Published', value: 'published', icon: Icons.circleCheck },
        { label: 'Draft', value: 'draft', icon: Icons.edit },
        { label: 'Closed', value: 'closed', icon: Icons.circleX },
        { label: 'Archived', value: 'archived', icon: Icons.eyeOff }
      ]
    },
    enableColumnFilter: true
  },
  {
    id: 'questionsCount',
    accessorKey: 'questionsCount',
    header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
      <DataTableColumnHeader column={column} title='Questions' />
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
      <DataTableColumnHeader column={column} title='Responses' />
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
          {count.toLocaleString()}
        </span>
      );
    }
  },
  {
    id: 'completionRate',
    accessorKey: 'completionRate',
    header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
      <DataTableColumnHeader column={column} title='Completion' />
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

      const display =
        Number.isInteger(rate) ? `${rate}%` : `${rate.toFixed(1)}%`;

      return (
        <div
          className='flex min-w-[7.5rem] items-center gap-2.5'
          title={`${display} completion`}
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
      <DataTableColumnHeader column={column} title='Updated' />
    ),
    cell: ({ cell }) => {
      const iso = cell.getValue<string>();
      const absolute = new Date(iso).toLocaleString('en-US', {
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
    header: () => <span className='sr-only'>Open</span>,
    cell: () => (
      <span className='text-muted-foreground flex justify-end opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100'>
        <Icons.chevronRight className='size-4' aria-hidden />
      </span>
    ),
    size: 40
  }
];
