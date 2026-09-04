'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Icons } from '@/components/icons';
import type { Option } from '@/types/data-table';
import type { Respondent, RespondentStatus } from '../api/types';

export const STATUS_OPTIONS: Option[] = [
  { label: 'Completed', value: 'completed', icon: Icons.circleCheck },
  { label: 'Partial', value: 'partial', icon: Icons.clock }
];

const STATUS_CONFIG: Record<RespondentStatus, { label: string; variant: 'default' | 'secondary' }> =
  {
    completed: { label: 'Completed', variant: 'default' },
    partial: { label: 'Partial', variant: 'secondary' }
  };

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatSubmitted(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export const columns: ColumnDef<Respondent>[] = [
  {
    id: 'name',
    accessorFn: (row) => row.name,
    header: ({ column }: { column: Column<Respondent, unknown> }) => (
      <DataTableColumnHeader column={column} title='Respondent' />
    ),
    cell: ({ row }) => (
      <div className='flex items-center gap-3'>
        <div className='bg-primary/10 text-primary flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold'>
          {initialsOf(row.original.name)}
        </div>
        <div className='min-w-0'>
          <p className='truncate text-sm font-medium'>{row.original.name}</p>
          <p className='text-muted-foreground truncate text-xs'>{row.original.email}</p>
        </div>
      </div>
    ),
    meta: {
      label: 'Respondent',
      placeholder: 'Search name or email...',
      variant: 'text',
      icon: Icons.search
    },
    enableColumnFilter: true
  },
  {
    id: 'status',
    accessorKey: 'status',
    enableSorting: false,
    header: ({ column }: { column: Column<Respondent, unknown> }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    cell: ({ cell }) => {
      const status = cell.getValue<RespondentStatus>();
      const config = STATUS_CONFIG[status];
      return (
        <Badge variant={config.variant} className='text-xs'>
          {status === 'completed' && <Icons.circleCheck className='mr-1 h-3 w-3' />}
          {config.label}
        </Badge>
      );
    },
    meta: {
      label: 'Status',
      variant: 'select',
      options: STATUS_OPTIONS
    },
    enableColumnFilter: true
  },
  {
    id: 'submittedAt',
    accessorKey: 'submittedAt',
    header: ({ column }: { column: Column<Respondent, unknown> }) => (
      <DataTableColumnHeader column={column} title='Submitted' />
    ),
    cell: ({ cell }) => {
      const iso = cell.getValue<string>();
      return (
        <span className='text-muted-foreground text-xs'>{formatSubmitted(iso)}</span>
      );
    }
  },
  {
    id: 'durationSeconds',
    accessorKey: 'durationSeconds',
    header: ({ column }: { column: Column<Respondent, unknown> }) => (
      <DataTableColumnHeader column={column} title='Duration' />
    ),
    cell: ({ cell }) => {
      const seconds = cell.getValue<number>();
      return (
        <span className='text-muted-foreground text-xs tabular-nums'>
          {formatDuration(seconds)}
        </span>
      );
    }
  }
];
