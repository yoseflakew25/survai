'use client';

import type { Table } from '@tanstack/react-table';
import { Icons } from '@/components/icons';

import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DataTablePaginationProps<TData> extends React.ComponentProps<'div'> {
  table: Table<TData>;
  pageSizeOptions?: number[];
  rowNoun?: string;
}

export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 30, 50],
  rowNoun = 'surveys',
  className,
  ...props
}: DataTablePaginationProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalRows = table.getFilteredRowModel().rows.length;
  const pageCount = table.getPageCount();
  const currentPage = table.getState().pagination.pageIndex + 1;

  return (
    <div
      className={cn(
        'flex w-full flex-wrap items-center justify-between gap-3 px-1 py-1',
        className
      )}
      {...props}
    >
      {/* Left: row count / selection */}
      <div className='text-muted-foreground text-xs'>
        {selectedCount > 0 ? (
          <span>
            <span className='text-foreground font-medium'>{selectedCount}</span>
            {' '}of{' '}
            <span className='text-foreground font-medium'>{totalRows}</span>
            {' '}selected
          </span>
        ) : (
          <span>
            <span className='text-foreground font-medium'>{totalRows}</span>
            {' '}{rowNoun}
          </span>
        )}
      </div>

      {/* Right: page size + page nav */}
      <div className='flex items-center gap-4'>
        {/* Rows per page */}
        <div className='hidden items-center gap-2 sm:flex'>
          <span className='text-muted-foreground text-xs'>Rows</span>
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className='h-7 w-[3.5rem] text-xs'>
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side='top'>
              <SelectGroup>
                {pageSizeOptions.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Page indicator */}
        <span className='text-muted-foreground text-xs tabular-nums'>
          {currentPage} / {pageCount}
        </span>

        {/* Page navigation */}
        <div className='flex items-center gap-0.5'>
          <Button
            aria-label='Previous page'
            variant='outline'
            size='icon'
            className='size-7'
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <Icons.chevronLeft className='size-3.5' />
          </Button>
          <Button
            aria-label='Next page'
            variant='outline'
            size='icon'
            className='size-7'
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <Icons.chevronRight className='size-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
