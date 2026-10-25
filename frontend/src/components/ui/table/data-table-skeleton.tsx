import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface DataTableSkeletonProps extends React.ComponentProps<'div'> {
  columnCount: number;
  rowCount?: number;
  filterCount?: number;
  cellWidths?: string[];
  withViewOptions?: boolean;
  withPagination?: boolean;
  shrinkZero?: boolean;
}

export function DataTableSkeleton({
  columnCount,
  rowCount = 10,
  filterCount = 0,
  cellWidths = ['auto'],
  withViewOptions = true,
  withPagination = true,
  shrinkZero = false,
  className,
  ...props
}: DataTableSkeletonProps) {
  const cozyCellWidths = Array.from(
    { length: columnCount },
    (_, index) => cellWidths[index % cellWidths.length] ?? 'auto'
  );

  return (
    <div className={cn('flex flex-1 flex-col space-y-4', className)} {...props}>
      <div className='flex w-full items-center justify-between gap-2 overflow-auto p-1'>
        <div className='flex flex-1 items-center gap-2'>
          {filterCount > 0
            ? Array.from({ length: filterCount }).map((_, i) => (
                <Skeleton key={i} className='h-9 w-40 rounded-xl' />
              ))
            : null}
        </div>
        {withViewOptions ? (
          <Skeleton className='ml-auto hidden h-9 w-[4.5rem] rounded-xl lg:flex' />
        ) : null}
      </div>

      <div className='overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
        <Table>
          <TableHeader className='border-b border-border bg-muted/30'>
            {Array.from({ length: 1 }).map((_, i) => (
              <TableRow key={i} className='hover:bg-transparent'>
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableHead
                    key={j}
                    className='first:pl-4 last:pr-4'
                    style={{
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : 'auto'
                    }}
                  >
                    <Skeleton className='h-5 w-full rounded' />
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }).map((_, i) => (
              <TableRow key={i} className='hover:bg-transparent'>
                {Array.from({ length: columnCount }).map((_, j) => (
                  <TableCell
                    key={j}
                    className='first:pl-4 last:pr-4'
                    style={{
                      width: cozyCellWidths[j],
                      minWidth: shrinkZero ? cozyCellWidths[j] : 'auto'
                    }}
                  >
                    <Skeleton className='h-5 w-full rounded' />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {withPagination ? (
          <div className='flex w-full items-center justify-between gap-3 border-t border-border px-3 py-2'>
            <Skeleton className='h-5 w-24 rounded' />
            <div className='flex items-center gap-2'>
              <Skeleton className='hidden h-8 w-14 rounded-lg sm:block' />
              <Skeleton className='h-5 w-20 rounded' />
              <Skeleton className='size-8 rounded-lg' />
              <Skeleton className='size-8 rounded-lg' />
              <Skeleton className='hidden size-8 rounded-lg lg:block' />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
