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
import type { AdminOrg } from '@/features/admin/api/types';
import { relativeTime } from '@/features/admin/components/overview/format';
import { cn } from '@/lib/utils';

function enabledFlagCount(flags: Record<string, boolean>) {
  return Object.values(flags).filter(Boolean).length;
}

export type AdminOrgRowActions = {
  onImpersonate: (org: AdminOrg) => void;
  onSuspendToggle: (org: AdminOrg) => void;
  pendingOrgId: string | null;
};

export function createAdminOrgColumns(
  actions: AdminOrgRowActions
): ColumnDef<AdminOrg>[] {
  return [
    {
      id: 'name',
      accessorKey: 'name',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Organization' />
      ),
      cell: ({ row }) => {
        const org = row.original;
        return (
          <div className='min-w-[12rem] max-w-md'>
            <Link
              href={`/admin/orgs/${org.id}`}
              className='font-semibold tracking-tight text-foreground underline-offset-2 hover:text-primary hover:underline'
            >
              {org.name}
            </Link>
            {org.description ? (
              <p className='mt-0.5 line-clamp-1 text-xs text-muted-foreground'>
                {org.description}
              </p>
            ) : null}
            {org.website ? (
              <p className='mt-0.5 truncate font-mono text-[10px] text-muted-foreground'>
                {org.website.replace(/^https?:\/\//, '')}
              </p>
            ) : null}
          </div>
        );
      }
    },
    {
      id: 'members',
      accessorKey: 'member_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Members' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums text-foreground'>
          {row.original.member_count}
        </span>
      )
    },
    {
      id: 'surveys',
      accessorKey: 'survey_count',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Surveys' />
      ),
      cell: ({ row }) => (
        <span className='font-mono text-sm tabular-nums text-foreground'>
          {row.original.survey_count}
        </span>
      )
    },
    {
      id: 'flags',
      accessorFn: (row) => enabledFlagCount(row.feature_flags),
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='AI & product' />
      ),
      cell: ({ row }) => {
        const on = enabledFlagCount(row.original.feature_flags);
        const total = Object.keys(row.original.feature_flags).length;
        return (
          <span className='font-mono text-xs tabular-nums text-muted-foreground'>
            {on}/{total} on
          </span>
        );
      }
    },
    {
      id: 'created_at',
      accessorKey: 'created_at',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title='Created' />
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
      cell: ({ row }) => {
        const org = row.original;
        if (org.is_active) {
          return (
            <Badge
              variant='secondary'
              className='rounded-full border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-[10px] font-semibold text-foreground'
            >
              Active
            </Badge>
          );
        }
        return (
          <div className='flex max-w-[10rem] flex-col gap-0.5'>
            <Badge variant='destructive' className='w-fit rounded-full text-[10px]'>
              Suspended
            </Badge>
            {org.suspended_reason ? (
              <p className='line-clamp-1 text-[10px] text-muted-foreground'>
                {org.suspended_reason}
              </p>
            ) : null}
          </div>
        );
      }
    },
    {
      id: 'actions',
      header: () => <span className='sr-only'>Actions</span>,
      cell: ({ row }) => {
        const org = row.original;
        const pending = actions.pendingOrgId === org.id;
        return (
          <div className='flex items-center justify-end gap-1'>
            <Button
              nativeButton={false}
              variant='ghost'
              size='sm'
              className='hidden h-8 rounded-lg px-2 text-xs font-medium sm:inline-flex'
              render={<Link href={`/admin/orgs/${org.id}`} />}
            >
              Inspect
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='outline'
                    size='icon-sm'
                    className='rounded-lg'
                    disabled={pending}
                    aria-label={`Actions for ${org.name}`}
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
                <DropdownMenuItem
                  render={<Link href={`/admin/orgs/${org.id}`} />}
                >
                  <Icons.eye className='size-3.5' />
                  Inspect workspace
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!org.is_active}
                  onClick={() => actions.onImpersonate(org)}
                >
                  <Icons.user className='size-3.5' />
                  Impersonate owner
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant={org.is_active ? 'destructive' : 'default'}
                  onClick={() => actions.onSuspendToggle(org)}
                >
                  {org.is_active ? (
                    <>
                      <Icons.circleX className='size-3.5' />
                      Suspend org
                    </>
                  ) : (
                    <>
                      <Icons.circleCheck className='size-3.5' />
                      Reactivate org
                    </>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      }
    }
  ];
}

export function OrgKpiCard({
  label,
  value,
  hint,
  active,
  onClick
}: {
  label: string;
  value: string;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'h-full rounded-[1.125rem] border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft p-4 text-left transition-colors duration-200',
        onClick && 'cursor-pointer hover:bg-brand-soft/80',
        active &&
          'ring-2 ring-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))] ring-offset-2 ring-offset-background'
      )}
    >
      <p className='text-[12px] font-medium text-muted-foreground'>{label}</p>
      <p className='font-display text-3xl font-extrabold tracking-tight tabular-nums text-primary'>
        {value}
      </p>
      {hint ? (
        <p className='mt-1 font-mono text-[10px] tracking-wide text-muted-foreground uppercase'>
          {hint}
        </p>
      ) : null}
    </Tag>
  );
}
