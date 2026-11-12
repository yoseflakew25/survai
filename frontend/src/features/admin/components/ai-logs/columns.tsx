'use client';

import type { ColumnDef } from '@tanstack/react-table';

import { Badge } from '@/components/ui/badge';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { AdminAiLogItem } from '@/features/admin/api/types';
import { ADMIN_FEATURE_FLAG_LABELS } from '@/features/admin/components/orgs/feature-flags';
import { relativeTime } from '@/features/admin/components/overview/format';
import { cn } from '@/lib/utils';

function featureLabel(feature: string) {
  return ADMIN_FEATURE_FLAG_LABELS[feature] ?? feature.replace(/^ai_/, '').replace(/_/g, ' ');
}

export function createAdminAiLogColumns(): ColumnDef<AdminAiLogItem>[] {
  return [
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='When' />
      ),
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground'>
          {relativeTime(row.original.created_at)}
        </span>
      )
    },
    {
      id: 'feature',
      accessorKey: 'feature',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Feature' />
      ),
      cell: ({ row }) => (
        <div>
          <p className='text-sm font-medium text-foreground'>
            {featureLabel(row.original.feature)}
          </p>
          <p className='font-mono text-[10px] text-muted-foreground'>
            {row.original.feature}
          </p>
        </div>
      )
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) => {
        const ok = row.original.status === 'success';
        return (
          <Badge
            variant='outline'
            className={cn(
              'rounded-full text-[10px] capitalize',
              ok
                ? 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground'
                : 'border-destructive/30 bg-destructive/10 text-destructive'
            )}
          >
            {row.original.status}
          </Badge>
        );
      }
    },
    {
      id: 'model',
      accessorKey: 'model',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Model' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-xs text-muted-foreground'>
          {row.original.model}
        </span>
      )
    },
    {
      id: 'latency_ms',
      accessorKey: 'latency_ms',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Latency' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums text-foreground'>
          {row.original.latency_ms != null ? `${row.original.latency_ms}ms` : '—'}
        </span>
      )
    },
    {
      id: 'tokens',
      accessorFn: (row) => (row.tokens_input ?? 0) + (row.tokens_output ?? 0),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Tokens' />
      ),
      cell: ({ row }) => {
        const a = row.original;
        if (a.tokens_input == null && a.tokens_output == null) {
          return <span className='text-xs text-muted-foreground'>—</span>;
        }
        return (
          <span className='font-mono text-[11px] tabular-nums text-muted-foreground'>
            {a.tokens_input ?? 0}↓ {a.tokens_output ?? 0}↑
          </span>
        );
      }
    },
    {
      id: 'user',
      accessorFn: (row) => row.user_email ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User' />
      ),
      cell: ({ row }) => (
        <span className='max-w-[12rem] truncate text-xs text-muted-foreground'>
          {row.original.user_email ?? '—'}
        </span>
      )
    },
    {
      id: 'error',
      accessorKey: 'error_message',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Error' />
      ),
      cell: ({ row }) =>
        row.original.error_message ? (
          <p className='max-w-xs truncate text-xs text-destructive/90'>
            {row.original.error_message}
          </p>
        ) : (
          <span className='text-xs text-muted-foreground'>—</span>
        )
    }
  ];
}
