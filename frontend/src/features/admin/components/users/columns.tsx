'use client';

import type { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';

import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { DataTableColumnHeader } from '@/components/ui/table/data-table-column-header';
import type { AdminUser } from '@/features/admin/api/types';
import { relativeTime } from '@/features/admin/components/overview/format';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<AdminUser['role'], string> = {
  system_admin: 'System admin',
  organization: 'Owner',
  researcher: 'Researcher',
  viewer: 'Viewer'
};

const ROLE_BADGE_CLASS: Record<AdminUser['role'], string> = {
  system_admin:
    'border-[color-mix(in_srgb,var(--primary)_50%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] text-foreground',
  organization:
    'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground',
  researcher: 'border-border bg-muted/70 text-muted-foreground',
  viewer: 'border-border bg-card text-muted-foreground'
};

export function adminUserRoleLabel(role: AdminUser['role']) {
  return ROLE_LABELS[role] ?? role;
}

export type AdminUserRowActions = {
  onToggleActive: (user: AdminUser) => void;
  pendingUserId: string | null;
};

export function createAdminUserColumns(
  actions: AdminUserRowActions
): ColumnDef<AdminUser>[] {
  return [
    {
      id: 'user',
      accessorFn: (row) => row.full_name,
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='User' />
      ),
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className='min-w-[12rem]'>
            <div className='flex flex-wrap items-center gap-2'>
              <p className='font-semibold tracking-tight text-foreground'>
                {u.full_name}
              </p>
              {u.is_superuser ? (
                <Badge variant='outline' className='rounded-full text-[9px] uppercase'>
                  Superuser
                </Badge>
              ) : null}
              {u.email_verified ? (
                <Badge
                  variant='outline'
                  className='rounded-full border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft/50 text-[9px]'
                >
                  Verified
                </Badge>
              ) : null}
            </div>
            <p className='text-xs text-muted-foreground'>{u.email}</p>
          </div>
        );
      }
    },
    {
      id: 'role',
      accessorKey: 'role',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Role' />
      ),
      cell: ({ row }) => (
        <Badge
          variant='outline'
          className={cn(
            'rounded-full text-[10px] font-semibold',
            ROLE_BADGE_CLASS[row.original.role]
          )}
        >
          {ROLE_LABELS[row.original.role]}
        </Badge>
      )
    },
    {
      id: 'organization',
      accessorFn: (row) => row.organization_name ?? '',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Organization' />
      ),
      cell: ({ row }) => {
        const u = row.original;
        if (!u.organization_name) {
          return <span className='text-xs text-muted-foreground'>—</span>;
        }
        if (u.organization_id) {
          return (
            <Link
              href={`/admin/orgs/${u.organization_id}`}
              className='text-sm font-medium text-foreground underline-offset-2 hover:text-primary hover:underline'
            >
              {u.organization_name}
            </Link>
          );
        }
        return <span className='text-sm text-foreground'>{u.organization_name}</span>;
      }
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Joined' />
      ),
      cell: ({ row }) => (
        <span className='text-xs text-muted-foreground'>
          {relativeTime(row.original.created_at)}
        </span>
      )
    },
    {
      id: 'status',
      accessorKey: 'is_active',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Status' />
      ),
      cell: ({ row }) =>
        row.original.is_active ? (
          <Badge
            variant='secondary'
            className='rounded-full border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-[10px] font-semibold'
          >
            Active
          </Badge>
        ) : (
          <Badge variant='destructive' className='rounded-full text-[10px]'>
            Inactive
          </Badge>
        )
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const u = row.original;
        const pending = actions.pendingUserId === u.id;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant='outline'
                  size='icon-sm'
                  className='rounded-lg'
                  disabled={pending}
                  aria-label={`Actions for ${u.full_name}`}
                />
              }
            >
              {pending ? (
                <Icons.spinner className='size-3.5 animate-spin' />
              ) : (
                <Icons.ellipsis className='size-3.5' />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-44'>
              {u.organization_id ? (
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link
                      href={`/admin/orgs/${u.organization_id}`}
                      aria-label={`View organization for ${u.full_name || u.email}`}
                    />
                  }
                >
                  <Icons.workspace className='size-3.5' />
                  View organization
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant={u.is_active ? 'destructive' : 'default'}
                onClick={() => actions.onToggleActive(u)}
              >
                {u.is_active ? (
                  <>
                    <Icons.circleX className='size-3.5' />
                    Deactivate
                  </>
                ) : (
                  <>
                    <Icons.circleCheck className='size-3.5' />
                    Activate
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ];
}
