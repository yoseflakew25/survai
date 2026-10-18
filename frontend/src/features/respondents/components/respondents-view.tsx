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
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { respondentsOptions } from '../api/queries';
import { createColumns } from './columns';
import { RespondentDetailSheet } from './respondent-detail-sheet';
import type { Respondent, RespondentStatus } from '../api/types';
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
  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    name: parseAsString,
    status: parseAsString,
    question: parseAsString,
    answer: parseAsString,
    respondent: parseAsString,
    sort: getSortingStateParser<Respondent>(SORTABLE_COLUMN_IDS).withDefault([])
  });

  const openRespondent = useCallback(
    (respondentId: string) => {
      void setParams({ respondent: respondentId });
    },
    [setParams]
  );

  const closeRespondent = useCallback(() => {
    void setParams({ respondent: null });
  }, [setParams]);

  const columns = useMemo(
    () => createColumns(openRespondent),
    [openRespondent]
  );

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

  type SortId = 'submittedAt' | 'name';
  type SortItem = { id: string; desc: boolean };
  const sortOptions: Array<{ id: SortId; label: string }> = [
    { id: 'submittedAt', label: 'Date & time' },
    { id: 'name', label: 'Alphabetically' }
  ];

  const activeSortId: SortId | null = (() => {
    if (params.sort.length === 0) return null;
    const primary = params.sort[0];
    if (!primary) return null;
    if (primary.id === 'submittedAt' || primary.id === 'name') return primary.id as SortId;
    return null;
  })();

  function toggleSort(id: SortId) {
    const current: SortItem[] = params.sort;
    const existing = current.find((s: SortItem) => s.id === id);
    const nextDir = existing?.desc ? 'asc' : 'desc';
    const next: SortItem[] = existing
      ? current.map((s: SortItem) => (s.id === id ? { id, desc: nextDir === 'desc' } : s))
      : [{ id, desc: nextDir === 'desc' }, ...current.map((s: SortItem) => ({ id: s.id, desc: s.desc }))];
    const nextSort: SortItem[] = next.length
      ? next.filter((s: SortItem) => SORTABLE_COLUMN_IDS.includes(s.id as SortId))
      : [];
    void setParams({ page: 1, sort: nextSort as never });
  }

  const noResponsesYet = summary.responses === 0;

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <RespondentDetailSheet
        surveyId={surveyId}
        respondentId={params.respondent}
        onClose={closeRespondent}
      />

      {/* No responses yet — CTA instead of the table */}
      {noResponsesYet ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm'>
          <Icons.teams className='text-muted-foreground mb-3 h-10 w-10' />
          <h3 className='font-display font-bold tracking-tight'>No responses yet</h3>
          <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
            Publish your survey and share the collection link to start receiving responses.
          </p>
          <Link href={`/dashboard/surveys/${surveyId}/collect`} className='mt-4'>
            <Button className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground hover:brightness-105'>
              <Icons.send className='mr-1.5 h-3.5 w-3.5' />
              Go to Collect
            </Button>
          </Link>
        </div>
      ) : (
        <>
          {/* Header: the heading */}
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <Heading
              title='Respondents'
              description='People who submitted responses to this survey'
            />
            {/* Stats cards */}
            <div className='grid flex-1 gap-3 sm:grid-cols-4'>
              {statTiles.map((stat) => {
                const IconComponent = Icons[stat.icon];
                return (
                  <div
                    key={stat.label}
                    className='flex items-center gap-3 rounded-xl border border-border bg-card p-2.5 shadow-sm'
                  >
                    <div className='min-w-0'>
                      <p className='text-muted-foreground truncate text-[10px] font-medium tracking-wide uppercase'>
                        {stat.label}
                      </p>
                      <p className='font-display truncate text-xl font-extrabold tracking-tight tabular-nums'>
                        {stat.value}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>


          {/* Analytics drill-down context */}
          {data.activeFilter && (
            <div className='flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-border bg-brand-soft/60 px-3 py-2 text-sm'>
              <span className='text-muted-foreground text-xs'>
                Respondents who answered
              </span>
              <span className='min-w-0 max-w-[16rem] truncate font-medium'>
                {data.activeFilter.questionText}
              </span>
              <Icons.arrowRight className='text-muted-foreground h-3 w-3' />
              <span className='font-semibold text-foreground'>
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

          <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
            {/* Table */}
            <Table>
              <TableHeader className='bg-card'>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className='hover:bg-transparent'>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className='first:pl-4 last:pr-4 text-md'>
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
                  <TableRow
                    key={row.id}
                    className='cursor-pointer'
                    data-state={
                      params.respondent === row.original.id
                        ? 'selected'
                        : undefined
                    }
                    onClick={() => openRespondent(row.original.id)}
                  >
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
