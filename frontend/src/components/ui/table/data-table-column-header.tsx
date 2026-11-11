'use client';

import type { Column } from '@tanstack/react-table';
import { Icons } from '@/components/icons';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface DataTableColumnHeaderProps<TData, TValue>
  extends React.ComponentProps<typeof DropdownMenuTrigger> {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort() && !column.getCanHide()) {
    return (
      <div className={cn('text-[15px] font-semibold text-brand-foreground', className)}>
        {title}
      </div>
    );
  }

  const isSorted = Boolean(column.getIsSorted());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          '-ml-1.5 flex h-9 items-center gap-1.5 rounded-lg px-2 py-1.5 text-[15px] font-semibold text-brand-foreground focus:ring-1 focus:ring-primary focus:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0',
          isSorted
            ? 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)]'
            : 'hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] data-popup-open:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]',
          className
        )}
        {...props}
      >
        {title}
        {column.getCanSort() &&
          (column.getIsSorted() === 'desc' ? (
            <Icons.chevronDown className='text-brand-foreground' />
          ) : column.getIsSorted() === 'asc' ? (
            <Icons.chevronUp className='text-brand-foreground' />
          ) : (
            <Icons.chevronsUpDown className='text-brand-foreground/70' />
          ))}
      </DropdownMenuTrigger>
      <DropdownMenuContent align='start' className='w-28 rounded-xl'>
        {column.getCanSort() && (
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              closeOnClick
              className='[&_svg]:text-muted-foreground relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto'
              checked={column.getIsSorted() === 'asc'}
              onClick={() => column.toggleSorting(false)}
            >
              <Icons.chevronUp />
              Asc
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem
              closeOnClick
              className='[&_svg]:text-muted-foreground relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto'
              checked={column.getIsSorted() === 'desc'}
              onClick={() => column.toggleSorting(true)}
            >
              <Icons.chevronDown />
              Desc
            </DropdownMenuCheckboxItem>
            {column.getIsSorted() && (
              <DropdownMenuItem
                className='[&_svg]:text-muted-foreground pl-2'
                onClick={() => column.clearSorting()}
              >
                <Icons.close />
                Reset
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
        )}
        {column.getCanHide() && (
          <DropdownMenuCheckboxItem
            closeOnClick
            className='[&_svg]:text-muted-foreground relative pr-8 pl-2 [&>span:first-child]:right-2 [&>span:first-child]:left-auto'
            checked={!column.getIsVisible()}
            onClick={() => column.toggleVisibility(false)}
          >
            <Icons.eyeOff />
            Hide
          </DropdownMenuCheckboxItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
