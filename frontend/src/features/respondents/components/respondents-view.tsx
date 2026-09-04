'use client';

import Link from 'next/link';
import { flexRender } from '@tanstack/react-table';
import { useDataTable } from '@/hooks/use-data-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Icons } from '@/components/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { DataTablePagination } from '@/components/ui/table/data-table-pagination';
import { DataTableToolbar } from '@/components/ui/table/data-table-toolbar';
import { DataTableViewOptions } from '@/components/ui/table/data-table-view-options';
import { useSuspenseQuery } from '@tanstack/react-query';
import { respondentsOptions } from '../api/queries';
import { columns } from './columns';
import type { RespondentStatus } from '../api/types';
import type { Icon } from '@/components/icons';

interface RespondentsViewProps {
  surveyId: string;
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

export function RespondentsView({ surveyId }: RespondentsViewProps) {
  const [params] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    status: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.status && { status: params.status as RespondentStatus }),
    ...(params.sort.length > 0 && { sort: JSON.stringify(params.sort) })
  };

  const { data } = useSuspenseQuery(respondentsOptions(surveyId, filters));
  const pageCount = Math.ceil(data.total / params.perPage);

  const { table } = useDataTable({
    data: data.respondents,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500
  });

  const summary = data.summary;
  const statTiles: {
    label: string;
    value: string;
    icon: Icon;
  }[] = [
    { label: 'Total', value: summary.responses.toLocaleString(), icon: Icons.teams },
    { label: 'Completed', value: summary.completed.toLocaleString(), icon: Icons.circleCheck },
    { label: 'Partial', value: summary.partial.toLocaleString(), icon: Icons.clock },
    {
      label: 'Avg. Duration',
      value: formatDuration(summary.avgDurationSeconds),
      icon: Icons.clock
    }
  ];

  const visibleCount = table.getRowModel().rows.length;
  const noResponsesYet = summary.responses === 0;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Header */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Heading
          title='Respondents'
          description='People who submitted responses to this survey'
        />
        <Badge variant='secondary' className='text-xs'>
          {summary.responses.toLocaleString()}{' '}
          {summary.responses === 1 ? 'response' : 'responses'}
        </Badge>
      </div>

      {/* Stats tiles */}
      <div className='grid grid-cols-2 gap-3 sm:grid-cols-4'>
        {statTiles.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className='rounded-lg bg-muted/40 p-3.5'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-muted-foreground text-[10px] font-medium tracking-wide uppercase'>
                  {stat.label}
                </p>
                <div className='bg-primary/10 flex size-7 shrink-0 items-center justify-center rounded-md'>
                  <Icon className='text-primary size-4' />
                </div>
              </div>
              <p className='mt-2 text-2xl font-semibold tracking-tight tabular-nums'>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* No responses yet — CTA instead of the table */}
      {noResponsesYet ? (
        <div className='flex flex-col items-center justify-center rounded-lg border bg-background px-6 py-16 text-center'>
          <Icons.teams className='text-muted-foreground mb-3 h-10 w-10' />
          <h3 className='font-semibold'>No responses yet</h3>
          <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
            Publish your survey and share the collection link to start receiving responses.
          </p>
          <Link href={`/dashboard/surveys/${surveyId}/collect`} className='mt-4'>
            <Button>
              <Icons.send className='mr-1.5 h-3.5 w-3.5' />
              Go to Collect
            </Button>
          </Link>
        </div>
      ) : (
        <div className='overflow-hidden rounded-lg border bg-background'>
          {/* Toolbar */}
          <div className='flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b bg-muted/30 px-3 py-2'>
            <div className='min-w-0'>
              <h3 className='text-sm font-semibold'>Submissions</h3>
              <p className='text-muted-foreground truncate text-xs'>
                Showing {visibleCount.toLocaleString()} of {data.total.toLocaleString()}
              </p>
            </div>
            <DataTableToolbar table={table} className='w-auto flex-none p-0'>
              <DataTableViewOptions table={table} />
            </DataTableToolbar>
          </div>

          {/* Table */}
          <Table>
            <TableHeader className='bg-muted/50'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className='first:pl-4 last:pr-4'>
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
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className='first:pl-4 last:pr-4'>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-40 text-center'
                  >
                    <div className='flex flex-col items-center justify-center gap-2 text-center'>
                      <div className='bg-muted flex size-12 items-center justify-center rounded-full'>
                        <Icons.search className='text-muted-foreground/50 size-5' />
                      </div>
                      <p className='text-sm font-medium'>No respondents found</p>
                      <p className='text-muted-foreground text-xs'>
                        Try adjusting your search or filter criteria
                      </p>
                      <Button
                        variant='ghost'
                        size='sm'
                        className='mt-1'
                        onClick={() => table.resetColumnFilters()}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className='border-t px-3 py-2'>
            <DataTablePagination table={table} rowNoun='respondents' className='px-0 py-0' />
          </div>
        </div>
      )}
    </div>
  );
}
