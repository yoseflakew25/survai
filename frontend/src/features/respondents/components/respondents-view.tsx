'use client';

import Link from 'next/link';
import { useDataTable } from '@/hooks/use-data-table';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { DataTable } from '@/components/ui/table/data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { respondentsOptions } from '../api/queries';
import { createColumns } from './columns';
import { RespondentDetailSheet } from './respondent-detail-sheet';
import type { Respondent, RespondentStatus } from '../api/types';

interface RespondentsViewProps {
  surveyId: string;
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

  const noResponsesYet = data.summary.responses === 0;
  const hasAnswerFilter = Boolean(params.question || params.answer);

  return (
    <div className='flex flex-1 flex-col gap-4'>
      <RespondentDetailSheet
        surveyId={surveyId}
        respondentId={params.respondent}
        onClose={closeRespondent}
      />

      {noResponsesYet ? (
        <div className='flex flex-col items-center justify-center rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-sm'>
          <div className='mb-3 flex size-12 items-center justify-center rounded-2xl bg-brand-soft'>
            <Icons.teams className='size-5 text-foreground' />
          </div>
          <h3 className='font-display font-bold tracking-tight'>
            No responses yet
          </h3>
          <p className='text-muted-foreground mt-1 max-w-xs text-sm'>
            Publish your survey and share the collection link to start receiving
            responses.
          </p>
          <Link
            href={`/dashboard/surveys/${surveyId}/collect`}
            className='mt-4'
          >
            <Button className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground hover:brightness-105'>
              <Icons.send className='mr-1.5 h-3.5 w-3.5' />
              Go to Collect
            </Button>
          </Link>
        </div>
      ) : (
        <>
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

          <DataTable
            table={table}
            rowNoun={data.total === 1 ? 'respondent' : 'respondents'}
            onRowClick={(row) => openRespondent(row.id)}
            isRowSelected={(row) => row.id === params.respondent}
            emptyIcon={
              <div className='flex size-12 items-center justify-center rounded-2xl bg-brand-soft'>
                <Icons.search className='size-5 text-foreground' />
              </div>
            }
            emptyTitle={
              hasAnswerFilter ? 'No matching respondents' : 'No respondents found'
            }
            emptyDescription={
              hasAnswerFilter
                ? 'Clear the answer filter or adjust search criteria.'
                : 'Try adjusting your search or filter criteria.'
            }
          />
        </>
      )}
    </div>
  );
}
