'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { AdminAuditItem } from '@/features/admin/api/types';
import { formatAction, relativeTime } from '@/features/admin/components/overview/format';

export function createAdminAuditColumns(): ColumnDef<AdminAuditItem>[] {
  return [
    {
      id: 'action',
      accessorKey: 'action',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Action' />
      ),
      cell: ({ row }) => (
        <p className='max-w-md text-sm font-semibold tracking-tight text-foreground'>
          {formatAction(row.original.action)}
        </p>
      )
    },
    {
      id: 'actor',
      accessorFn: (row) => row.actor_email ?? row.actor_user_id ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Actor' />
      ),
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className='min-w-[10rem]'>
            <p className='text-sm text-foreground'>
              {a.actor_email ?? (a.actor_user_id ? 'User' : 'system')}
            </p>
            {a.actor_email && a.actor_user_id ? (
              <p className='font-mono text-[10px] text-muted-foreground'>
                {a.actor_user_id.slice(0, 8)}
              </p>
            ) : null}
          </div>
        );
      }
    },
    {
      id: 'resource',
      accessorKey: 'resource_type',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Resource' />
      ),
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className='text-xs text-muted-foreground'>
            <p className='font-medium text-foreground'>{a.resource_type}</p>
            {a.resource_id ? (
              <p className='font-mono text-[10px]'>{a.resource_id.slice(0, 8)}</p>
            ) : null}
          </div>
        );
      }
    },
    {
      id: 'organization',
      accessorKey: 'organization_id',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Org' />
      ),
      cell: ({ row }) => {
        const id = row.original.organization_id;
        if (!id) return <span className='text-xs text-muted-foreground'>—</span>;
        return (
          <Link
            href={`/admin/orgs/${id}`}
            className='font-mono text-xs text-primary hover:underline'
          >
            {id.slice(0, 8)}
          </Link>
        );
      }
    },
    {
      id: 'ip',
      accessorKey: 'ip',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='IP' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-[11px] text-muted-foreground'>
          {row.original.ip ?? '—'}
        </span>
      )
    },
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
    }
  ];
}
