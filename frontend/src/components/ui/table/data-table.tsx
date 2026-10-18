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

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  rowNoun?: string;
  onRowClick?: (row: TData) => void;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  rowNoun = 'surveys',
  onRowClick
}: DataTableProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className='flex flex-col space-y-4'>
      {children}

      {/* Selection indicator */}
      {selectedCount > 0 && (
        <div className='flex items-center gap-2 rounded-xl border border-border bg-brand-soft/60 px-3 py-2 text-sm'>
          <Icons.circleCheck className='size-4 text-foreground' />
          <span className='font-medium text-foreground'>
            {selectedCount} selected
          </span>
          <span className='text-muted-foreground'>
            of {table.getFilteredRowModel().rows.length} surveys
          </span>
        </div>
      )}

      {/* Table — size to content, not viewport fill */}
      <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <ScrollArea className='w-full'>
          <Table>
            <TableHeader className='border-b border-border bg-muted/35'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='hover:bg-transparent'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className='bg-transparent first:pl-4 last:pr-3'
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
                    tabIndex={onRowClick ? 0 : undefined}
                    role={onRowClick ? 'link' : undefined}
                    className={
                      onRowClick
                        ? 'cursor-pointer outline-none focus-visible:bg-muted/55 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40'
                        : undefined
                    }
                    onClick={
                      onRowClick
                        ? () => onRowClick(row.original)
                        : undefined
                    }
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              onRowClick(row.original);
                            }
                          }
                        : undefined
                    }
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className='bg-transparent py-2.5 first:pl-4 last:pr-3'
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
                <TableRow className='hover:bg-transparent'>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className='h-48'
                  >
                    <div className='flex flex-col items-center justify-center gap-3 px-4 text-center'>
                      {emptyIcon ?? (
                        <div className='bg-brand-soft flex size-12 items-center justify-center rounded-2xl'>
                          <Icons.forms className='text-foreground size-5' />
                        </div>
                      )}
                      <div>
                        <p className='font-display text-sm font-bold tracking-tight'>
                          {emptyTitle ?? 'No surveys found'}
                        </p>
                        <p className='text-muted-foreground mt-1 max-w-xs text-xs leading-relaxed'>
                          {emptyDescription ??
                            'Try adjusting your search or status filter, or create a new survey.'}
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

      {/* Pagination */}
      <div className='flex flex-col gap-2.5'>
        <DataTablePagination table={table} rowNoun={rowNoun} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
