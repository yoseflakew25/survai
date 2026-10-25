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
    return <div className={cn(className)}>{title}</div>;
  }

  const isSorted = Boolean(column.getIsSorted());

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          '-ml-1.5 flex h-8 items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium focus:ring-1 focus:ring-ring focus:outline-none [&_svg]:size-3.5 [&_svg]:shrink-0',
          isSorted
            ? 'bg-brand-soft text-foreground'
            : 'text-muted-foreground hover:bg-brand-soft/50 hover:text-foreground data-popup-open:bg-brand-soft/50',
          className
        )}
        {...props}
      >
        {title}
        {column.getCanSort() &&
          (column.getIsSorted() === 'desc' ? (
            <Icons.chevronDown className='text-foreground' />
          ) : column.getIsSorted() === 'asc' ? (
            <Icons.chevronUp className='text-foreground' />
          ) : (
            <Icons.chevronsUpDown className='opacity-40' />
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
