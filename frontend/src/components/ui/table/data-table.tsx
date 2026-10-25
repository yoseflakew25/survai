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
import { cn } from '@/lib/utils';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  emptyIcon?: React.ReactNode;
  emptyTitle?: string;
  emptyDescription?: string;
  rowNoun?: string;
  onRowClick?: (row: TData) => void;
  /** Extra selected state beyond tanstack row selection (e.g. open detail sheet). */
  isRowSelected?: (row: TData) => boolean;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  rowNoun = 'surveys',
  onRowClick,
  isRowSelected,
  className,
  ...props
}: DataTableProps<TData>) {
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className={cn('flex flex-col space-y-4', className)} {...props}>
      {children}

      {selectedCount > 0 && (
        <div className='flex items-center gap-2 rounded-xl border border-border bg-brand-soft/60 px-3 py-2 text-sm'>
          <Icons.circleCheck className='size-4 text-foreground' />
          <span className='font-medium text-foreground'>
            <span className='tabular-nums'>{selectedCount}</span> selected
          </span>
          <span className='text-muted-foreground'>
            of{' '}
            <span className='tabular-nums'>
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            {rowNoun}
          </span>
        </div>
      )}

      {/* SurvaiPanel-equivalent card chrome */}
      <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <ScrollArea className='w-full'>
          <Table>
            <TableHeader className='border-b border-border bg-muted/30'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className='hover:bg-transparent data-[state=selected]:bg-transparent data-[state=selected]:shadow-none'
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className='bg-transparent first:pl-4 last:pr-4'
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
                table.getRowModel().rows.map((row) => {
                  const selected =
                    row.getIsSelected() ||
                    Boolean(isRowSelected?.(row.original));

                  return (
                    <TableRow
                      key={row.id}
                      data-state={selected ? 'selected' : undefined}
                      tabIndex={onRowClick ? 0 : undefined}
                      role={onRowClick ? 'link' : undefined}
                      className={
                        onRowClick
                          ? 'cursor-pointer outline-none focus-visible:bg-brand-soft/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/40'
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
                          className='bg-transparent first:pl-4 last:pr-4'
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
                  );
                })
              ) : (
                <TableRow className='hover:bg-transparent data-[state=selected]:shadow-none'>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className='h-48'
                  >
                    <div className='flex flex-col items-center justify-center gap-3 px-4 text-center'>
                      {emptyIcon ?? (
                        <div className='flex size-12 items-center justify-center rounded-2xl bg-brand-soft'>
                          <Icons.forms className='size-5 text-foreground' />
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

        {/* SurvaiPanelFooter-equivalent */}
        <div className='border-t border-border px-3 py-2'>
          <DataTablePagination
            table={table}
            rowNoun={rowNoun}
            variant='inset'
          />
        </div>
      </div>

      {actionBar && selectedCount > 0 ? (
        <div className='flex flex-col gap-2.5'>{actionBar}</div>
      ) : null}
    </div>
  );
}
