'use client';

import { type Table as TanstackTable, flexRender } from '@tanstack/react-table';
import type * as React from 'react';

import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { getCommonPinningStyles } from '@/lib/data-table';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  emptyIcon,
  emptyTitle,
  emptyDescription
}: DataTableProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className='flex flex-1 flex-col space-y-4'>
      {children}

      {/* Selection indicator */}
      {selectedCount > 0 && (
        <div className='bg-primary/5 flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-2 text-sm'>
          <Icons.circleCheck className='text-primary size-4' />
          <span className='text-primary font-medium'>
            {selectedCount} selected
          </span>
          <span className='text-muted-foreground'>
            of {table.getFilteredRowModel().rows.length} surveys
          </span>
        </div>
      )}

      {/* Table */}
      <div className='relative flex flex-1'>
        <div className='absolute inset-0 flex overflow-hidden rounded-lg border'>
          <ScrollArea className='h-full w-full'>
            <Table>
              <TableHeader className='bg-muted/50 sticky top-0 z-10 border-b'>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow
                    key={headerGroup.id}
                    className='hover:bg-transparent'
                  >
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className='first:pl-4 last:pr-4'
                        style={{
                          ...getCommonPinningStyles({ column: header.column })
                        }}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className='first:pl-4 last:pr-4'
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className='first:pl-4 last:pr-4'
                          style={{
                            ...getCommonPinningStyles({ column: cell.column })
                          }}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={table.getAllColumns().length}
                      className='h-40'
                    >
                      <div className='flex flex-col items-center justify-center gap-3 text-center'>
                        {emptyIcon ?? (
                          <div className='bg-muted flex size-12 items-center justify-center rounded-full'>
                            <Icons.search className='text-muted-foreground/50 size-5' />
                          </div>
                        )}
                        <div>
                          <p className='text-sm font-medium'>
                            {emptyTitle ?? 'No results found'}
                          </p>
                          <p className='text-muted-foreground mt-0.5 text-xs'>
                            {emptyDescription ??
                              'Try adjusting your search or filter criteria'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <ScrollBar orientation='horizontal' />
          </ScrollArea>
        </div>
      </div>

      {/* Pagination */}
      <div className='flex flex-col gap-2.5'>
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
