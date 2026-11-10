'use client';

import { useRouter } from 'next/navigation';
import { DataTable } from '@/components/ui/table/data-table';
import { useDataTable } from '@/hooks/use-data-table';
import { useQuery } from '@tanstack/react-query';
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
import { brandCtaClass } from '@/components/survai-panel';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { Skeleton } from '@/components/ui/skeleton';

const columnIds = columns
  .map((c) => c.id)
  .filter((id): id is string => Boolean(id) && id !== 'open');

const STATUS_OPTIONS = [
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Closed', value: 'closed' },
  { label: 'Archived', value: 'archived' }
];

export function SurveyTable() {
  return (
    <AuthQueryBoundary fallback={<SurveyTableSkeleton />}>
      <SurveyTableContent />
    </AuthQueryBoundary>
  );
}

function SurveyTableSkeleton() {
  return (
    <div className='flex flex-1 flex-col space-y-5'>
      <div className='flex flex-wrap items-end justify-between gap-3'>
        <div className='space-y-2'>
          <Skeleton className='h-8 w-40 rounded' />
          <Skeleton className='h-4 w-72 rounded' />
        </div>
        <Skeleton className='h-9 w-36 rounded-xl' />
      </div>
      <Skeleton className='h-64 w-full rounded-xl' />
    </div>
  );
}

function SurveyTableContent() {
  const router = useRouter();

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
    ...(params.status && {
      status: params.status as 'draft' | 'published' | 'closed' | 'archived'
    }),
    ...(params.sort.length > 0 && {
      sort: params.sort.map((s) => `${s.id}:${s.desc ? 'desc' : 'asc'}`).join(',')
    })
  };

  const { data, isLoading, isError, error, refetch } = useQuery(
    surveysListQueryOptions(filters)
  );
  const pageCount = Math.ceil((data?.total ?? 0) / params.perPage);

  const { table } = useDataTable({
    data: data?.surveys ?? [],
    columns,
    pageCount,
    shallow: true,
    debounceMs: 500
  });

  return (
    <>
      <div className='flex flex-1 flex-col space-y-5'>
        <div className='flex flex-wrap items-end justify-between gap-3'>
          <div className='mr-auto min-w-0'>
            <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
              Surveys
            </h1>
            <p className='text-muted-foreground  text-sm'>
              Build, publish, and collect responses for your surveys
            </p>
          </div>

          <div className='flex flex-wrap items-center justify-end gap-2'>
            <div className='relative'>
              <Icons.search className='text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2' />
              <Input
                placeholder='Search surveys...'
                value={(table.getColumn('title')?.getFilterValue() as string) ?? ''}
                onChange={(e) =>
                  table.getColumn('title')?.setFilterValue(e.target.value)
                }
                className='h-9 w-48 rounded-xl border-border bg-card pl-9 lg:w-64'
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant='outline'
                    className='h-9 rounded-xl border-border bg-card'
                  />
                }
              >
                <Icons.adjustments className='size-3.5' />
                {params.status
                  ? (STATUS_OPTIONS.find((o) => o.value === params.status)
                      ?.label ?? 'Status')
                  : 'Status'}
                {params.status ? (
                  <span className='rounded-full bg-muted px-1.5 text-[10px] font-bold text-foreground'>
                    1
                  </span>
                ) : (
                  <Icons.chevronDown className='size-3.5 opacity-50' />
                )}
              </DropdownMenuTrigger>
              <DropdownMenuContent align='end' className='w-44 rounded-xl'>
                <DropdownMenuGroup>
                  {STATUS_OPTIONS.map((opt) => (
                    <DropdownMenuCheckboxItem
                      key={opt.value}
                      closeOnClick
                      checked={params.status === opt.value}
                      onCheckedChange={() => {
                        void setParams({
                          status:
                            params.status === opt.value ? null : opt.value,
                          page: 1
                        });
                      }}
                    >
                      {opt.label}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuGroup>
                {params.status ? (
                  <>
                    <div className='bg-border mx-1 my-1 h-px' />
                    <DropdownMenuItem
                      onClick={() => void setParams({ status: null, page: 1 })}
                    >
                      Clear filter
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              className={brandCtaClass}
              onClick={() => router.push('/dashboard/surveys/new')}
            >
              <Icons.add className='mr-1 h-3.5 w-3.5' />
              New Survey
            </Button>
          </div>
        </div>

        {isLoading && !data ? (
          <Skeleton className='h-64 w-full rounded-xl' />
        ) : isError ? (
          <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border px-4 py-16 text-center'>
            <p className='font-display text-base font-bold tracking-tight'>
              Could not load surveys
            </p>
            <p className='text-muted-foreground max-w-sm text-sm'>
              {error instanceof Error
                ? error.message
                : 'Something went wrong. Please try again.'}
            </p>
            <Button
              type='button'
              variant='outline'
              className='h-9 rounded-xl'
              onClick={() => void refetch()}
            >
              Retry
            </Button>
          </div>
        ) : (
          <DataTable
            table={table}
            rowNoun={(data?.total ?? 0) === 1 ? 'survey' : 'surveys'}
            emptyIcon={
              <div className='bg-brand-soft flex size-12 items-center justify-center rounded-2xl'>
                <Icons.forms className='size-5 text-foreground' />
              </div>
            }
            emptyTitle={
              params.title || params.status
                ? 'No matching surveys'
                : 'No surveys yet'
            }
            emptyDescription={
              params.title || params.status
                ? 'Clear search or status filters to see more surveys.'
                : 'Create your first survey to start collecting responses.'
            }
            onRowClick={(survey) =>
              router.push(`/dashboard/surveys/${survey.id}/review`)
            }
          />
        )}
      </div>
    </>
  );
}
