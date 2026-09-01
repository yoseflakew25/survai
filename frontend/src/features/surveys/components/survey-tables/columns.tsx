'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import type { SurveyListItem, SurveyStatus } from '../../api/types';
import { CellActions } from './cell-actions';

const STATUS_CONFIG: Record<
  SurveyStatus,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }
> = {
  published: { label: 'Published', variant: 'default' },
  draft: { label: 'Draft', variant: 'secondary' },
  closed: { label: 'Closed', variant: 'outline' },
  archived: { label: 'Archived', variant: 'outline' }
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
          <div className='bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-lg'>
            <span className='text-primary text-xs font-bold'>
              {survey.title
                .split(' ')
                .map((w) => w[0])
                .join('')
                .slice(0, 2)
                .toUpperCase()}
            </span>
          </div>
          <div className='min-w-0'>
            <p className='truncate text-sm font-medium'>{survey.title}</p>
            {survey.description && (
              <p className='text-muted-foreground truncate text-xs'>
                {survey.description}
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
      return (
        <Badge variant={config.variant} className='text-xs'>
          {status === 'published' && (
            <Icons.circleCheck className='mr-1 h-3 w-3' />
          )}
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
        <span className='text-muted-foreground text-sm tabular-nums'>
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
        <span className='text-sm font-medium tabular-nums'>
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
          <div className='bg-muted h-1.5 w-16 overflow-hidden rounded-full'>
            <div
              className='bg-primary h-full rounded-full'
              style={{ width: `${rate}%` }}
            />
          </div>
          <span className='text-muted-foreground text-xs tabular-nums'>
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
    cell: ({ row }) => <CellActions data={row.original} />
  }
];
