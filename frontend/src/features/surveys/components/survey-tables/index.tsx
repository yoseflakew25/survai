'use client';

import { useState } from 'react';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { parseAsInteger, parseAsString, useQueryStates } from 'nuqs';
import { getSortingStateParser } from '@/lib/parsers';
import { surveysListQueryOptions } from '../../api/queries';
import { columns } from './columns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Icons } from '@/components/icons';

import { NewSurveyDialog } from '../new-survey-dialog';

const columnIds = columns.map((c) => c.id).filter(Boolean) as string[];

const STATUS_OPTIONS = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' }
];

export function SurveyTable() {
  const [newSurveyOpen, setNewSurveyOpen] = useState(false);

  const [params, setParams] = useQueryStates({
    page: parseAsInteger.withDefault(1),
    perPage: parseAsInteger.withDefault(10),
    title: parseAsString,
    status: parseAsString,
    sort: getSortingStateParser(columnIds).withDefault([])
  });

  const filters = {
    page: params.page,
    limit: params.perPage,
    ...(params.title && { search: params.title }),
    ...(params.status && { status: params.status as 'draft' | 'published' | 'closed' | 'archived' }),
    ...(params.sort.length > 0 && { sort: params.sort.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',') })
  };

  const { data } = useSuspenseQuery(surveysListQueryOptions(filters));
  const pageCount = Math.ceil(data.total / params.perPage);

  const { table } = useDataTable({
    data: data.surveys,
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500,
    initialState: {
      columnPinning: { right: ['actions'] }
    }
  });

  return (
    <>
      <div className='flex flex-1 flex-col space-y-4'>
        {/* Single-row header */}
        <div className='flex flex-wrap items-end justify-between gap-3'>
          {/* Title + description */}
          <div className='mr-auto min-w-0'>
            <h1 className='text-2xl font-bold tracking-tight text-primary dark:text-white'>Surveys</h1>
            <p className='text-muted-foreground text-sm'>
              Build, publish, and collect responses for your surveys
            </p>
          </div>
<div className='flex justify-center items-end gap-2'>

          {/* Search */}
          <Input
            placeholder='Search surveys...'
            value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn('title')?.setFilterValue(e.target.value)}
            className='w-48 lg:w-64'
          />

          {/* Status filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant='outline'>
                  <Icons.adjustments className='h-3.5 w-3.5' />
                  Status
                  {params.status && (
                    <span className='bg-primary/10 text-primary rounded-full px-1.5 text-[10px] font-bold'>
                      1
                    </span>
                  )}
                </Button>
              }
            />
            <DropdownMenuContent align='start' className='w-40'>
              <DropdownMenuGroup>
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={params.status === opt.value}
                    onSelect={(e) => {
                      e.preventDefault();
                      void setParams({
                        status: params.status === opt.value ? null : opt.value,
                        page: 1
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              {params.status && (
                <>
                  <div className='bg-border mx-1 my-1 h-px' />
                  <DropdownMenuItem
                    onSelect={() => void setParams({ status: null, page: 1 })}
                  >
                    Clear filter
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* New Survey button — opens dialog */}
          <Button  onClick={() => setNewSurveyOpen(true)}>
            <Icons.add className='mr-1 h-3.5 w-3.5' />
            New Survey
          </Button>

          </div>

        </div>

        {/* Table */}
        <DataTable table={table} />
      </div>

      {/* New Survey Dialog */}
      <NewSurveyDialog
        open={newSurveyOpen}
        onOpenChange={setNewSurveyOpen}
      />
    </>
  );
}
