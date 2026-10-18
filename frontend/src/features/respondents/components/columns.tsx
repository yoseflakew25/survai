'use client';

import type { Column, ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import type { Option } from '@/types/data-table';
import type { Respondent, RespondentStatus } from '../api/types';
import * as React from 'react';

export const STATUS_OPTIONS: Option[] = [
  { label: 'Completed', value: 'completed', icon: Icons.circleCheck },
  { label: 'Partial', value: 'partial', icon: Icons.clock }
];

const STATUS_CONFIG: Record<
  RespondentStatus,
  { label: string; className: string }
> = {
  completed: {
    label: 'Completed',
    className:
      'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-brand-foreground'
  },
  partial: {
    label: 'Partial',
    className: 'border-transparent bg-secondary text-secondary-foreground'
  }
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

export function createColumns(
  onSelectRespondent: (respondentId: string) => void
): ColumnDef<Respondent>[] {
  return [
    {
      id: 'name',
      accessorFn: (row) => row.name,
      header: ({ column }: { column: Column<Respondent, unknown> }) => (
        <div className='flex items-center gap-2'>
          <DataTableColumnHeader column={column} title='Respondent' />
          <Input
            placeholder='Search name or email...'
            aria-label='Search respondents'
            value={(column.getFilterValue() as string) ?? ''}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => column.setFilterValue(event.target.value)}
            className='h-7 w-48 lg:w-60 text-xs'
          />
        </div>
      ),
      cell: ({ row }) => (
        <button
          type='button'
          onClick={() => onSelectRespondent(row.original.id)}
          className='group flex w-full items-center gap-3 rounded-md text-left focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none'
        >
          <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-[11px] font-bold text-foreground'>
            {initialsOf(row.original.name)}
          </div>
          <div className='min-w-0'>
            <p className='text-sm font-medium underline-offset-4 group-hover:underline'>
              {row.original.name}
            </p>
            <p className='text-muted-foreground truncate text-xs'>{row.original.email}</p>
          </div>
        </button>
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
      header: ({ column }: { column: Column<Respondent, unknown> }) => {
        const active = column.getFilterValue() as string | undefined;
        const activeOption = STATUS_OPTIONS.find((o) => o.value === active);

        return (
          <div className='flex items-center gap-2'>
            <DataTableColumnHeader column={column} title='Status' />
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props) => (
                  <Button
                    {...props}
                    variant={active ? 'default' : 'outline'}
                    size='sm'
                    className='h-7 text-[11px]'
                  >
                    {activeOption?.icon && (
                      <activeOption.icon className='mr-1 h-3.5 w-3.5 shrink-0' />
                    )}
                    {activeOption?.label ?? 'All'}
                  </Button>
                )}
              />
              <DropdownMenuContent align='start' className='w-36'>
                <DropdownMenuItem onClick={() => column.setFilterValue(undefined)}>
                  All
                </DropdownMenuItem>
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() =>
                      column.setFilterValue(
                        active === option.value ? undefined : option.value
                      )
                    }
                    className={
                      active === option.value
                        ? 'bg-accent text-accent-foreground'
                        : undefined
                    }
                  >
                    {option.icon && (
                      <option.icon className='mr-2 h-3.5 w-3.5 shrink-0' />
                    )}
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
      cell: ({ cell }) => {
        const status = cell.getValue<RespondentStatus>();
        const config = STATUS_CONFIG[status];
        return (
          <Badge
            variant='outline'
            className={`rounded-full text-[10px] font-medium ${config.className}`}
          >
            {status === 'completed' ? (
              <Icons.circleCheck className='mr-1 h-3 w-3' />
            ) : null}
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
}
