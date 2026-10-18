'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { SurveyListItem, SurveyStatus } from '../../api/types';
import { CellActions } from './cell-actions';

const STATUS_CONFIG: Record<
  SurveyStatus,
  { label: string; className: string; icon?: typeof Icons.circleCheck }
> = {
  published: {
    label: 'Published',
    className:
      'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground',
    icon: Icons.circleCheck
  },
  draft: {
    label: 'Draft',
    className: 'border-transparent bg-secondary text-secondary-foreground'
  },
  closed: {
    label: 'Closed',
    className: 'border-border bg-card text-foreground'
  },
  archived: {
    label: 'Archived',
    className:
      'border-transparent bg-[color-mix(in_srgb,var(--gold)_22%,white)] text-foreground'
  }
};

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
        <div className='flex items-center gap-3'>
          <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft'>
            <span className='text-xs font-semibold text-foreground'>
              {survey.title
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div className='min-w-0'>
            <p className='truncate text-sm font-semibold tracking-tight'>
              {survey.title}
            </p>
            {survey.description ? (
              <p className='text-muted-foreground truncate text-xs'>
                {survey.description}
              </p>
            ) : null}
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
          className={cn('rounded-full text-[10px] font-medium', config.className)}
        >
          {StatusIcon ? <StatusIcon className='mr-1 h-3 w-3' /> : null}
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
        { label: 'Closed', value: 'closed', icon: Icons.close },
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
        <span className='text-muted-foreground font-mono text-sm tabular-nums'>
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
      return (
        <span className='font-mono text-sm font-medium tabular-nums'>
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
        return <span className='text-muted-foreground text-sm'>—</span>;
      }
      return (
        <div className='flex items-center gap-2'>
          <div className='h-1.5 w-16 overflow-hidden rounded-full bg-secondary'>
            <div
              className='h-full rounded-full bg-brand'
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className='text-muted-foreground font-mono text-xs tabular-nums'>
            {rate}%
          </span>
        </div>
      );
    }
  },
  {
    id: 'updatedAt',
    accessorKey: 'updatedAt',
    header: ({ column }: { column: Column<SurveyListItem, unknown> }) => (
      <DataTableColumnHeader column={column} title='Last Updated' />
    ),
    cell: ({ cell }) => {
      const date = new Date(cell.getValue<string>());
      const now = new Date();
      const diffDays = Math.floor(
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      let relative = '';
      if (diffDays === 0) relative = 'Today';
      else if (diffDays === 1) relative = 'Yesterday';
      else if (diffDays < 7) relative = `${diffDays} days ago`;
      else relative = date.toLocaleDateString();

      return (
        <span className='text-muted-foreground text-sm'>{relative}</span>
      );
    }
  },
  {
    id: 'actions',
    size: 52,
    enableSorting: false,
    enableHiding: false,
    cell: ({ row }) => (
      <div className='flex justify-end pr-1'>
        <CellActions data={row.original} />
      </div>
    )
  }
];
