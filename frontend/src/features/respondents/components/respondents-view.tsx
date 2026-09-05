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
import { useMemo } from 'react';
import { respondentsOptions } from '../api/queries';
import { createColumns } from './columns';
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

// Sortable columns (status is not sortable) — must stay in sync with ./columns
const SORTABLE_COLUMN_IDS = ['name', 'submittedAt', 'durationSeconds'];

export function RespondentsView({ surveyId }: RespondentsViewProps) {
  const columns = useMemo(() => createColumns(surveyId), [surveyId]);
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    status: parseAsString,
    question: parseAsString,
    answer: parseAsString,
    sort: getSortingStateParser(SORTABLE_COLUMN_IDS).withDefault([])
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.name && { search: params.name }),
    ...(params.status && { status: params.status as RespondentStatus }),
    ...(params.question && { question: params.question }),
    ...(params.answer && { answer: params.answer }),
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
  const statTiles: Array<{
    label: string;
    value: string;
    icon: Icon;
  }> = [
    { label: 'Total', value: summary.responses.toLocaleString(), icon: 'teams' as const },
    { label: 'Completed', value: summary.completed.toLocaleString(), icon: 'circleCheck' as const },
    { label: 'Partial', value: summary.partial.toLocaleString(), icon: 'clock' as const },
    {
      label: 'Avg. Duration',
      value: formatDuration(summary.avgDurationSeconds),
      icon: 'clock' as const
    }
  ];

  const noResponsesYet = summary.responses === 0;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      {/* Header + stats in one row */}
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <Heading
          title='Respondents'
          description='People who submitted responses to this survey'
        />
        <div className='grid flex-1 basis-[32rem] grid-cols-2 gap-3 sm:grid-cols-4'>
          {statTiles.map((stat) => {
            const Icon = Icons[stat.icon];
            return (
              <div
                key={stat.label}
                className='flex items-center gap-3 rounded-lg border bg-muted/40 p-3'
              >
                <div className='bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-md'>
                  {Icon && <Icon className='text-primary size-4' />}
                </div>
                <div className='min-w-0'>
                  <p className='text-muted-foreground truncate text-[10px] font-medium tracking-wide uppercase'>
                    {stat.label}
                  </p>
                  <p className='truncate text-xl font-semibold tracking-tight tabular-nums'>
                    {stat.value}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
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
        <>
          {/* Toolbar row */}
          <DataTableToolbar table={table}>
            <DataTableViewOptions table={table} />
          </DataTableToolbar>

          {/* Analytics drill-down context */}
          {data.activeFilter && (
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg border bg-primary/5 px-3 py-2 text-sm'>
              <span className='text-muted-foreground text-xs'>
                Respondents who answered
              </span>
              <span className='min-w-0 max-w-[16rem] truncate font-medium'>
                {data.activeFilter.questionText}
              </span>
              <Icons.arrowRight className='text-muted-foreground h-3 w-3' />
              <span className='text-primary font-semibold'>
                {data.activeFilter.answer}
              </span>
              <Badge variant='secondary' className='text-[10px]'>
                {data.activeFilter.count.toLocaleString()}
              </Badge>
              <Button
                variant='ghost'
                size='icon-sm'
                aria-label='Clear answer filter'
                className='ml-auto h-6 w-6'
                onClick={() =>
                  setParams({ question: null, answer: null, page: 1 })
                }
              >
                <Icons.close className='h-3.5 w-3.5' />
              </Button>
            </div>
          )}

          <div className='overflow-hidden rounded-lg border bg-background'>
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
                        onClick={() => {
                          table.resetColumnFilters();
                          void setParams({ question: null, answer: null, page: 1 });
                        }}
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
        </>
      )}
    </div>
  );
}
