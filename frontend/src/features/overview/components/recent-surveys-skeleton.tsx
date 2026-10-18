import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RecentSurveysSkeleton() {
  return (
    <Card className='h-full gap-0 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card py-0'>
      <CardHeader className='border-b border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-muted/25 px-5 py-4'>
        <Skeleton className='h-6 w-[160px]' />
        <Skeleton className='mt-2 h-4 w-[180px]' />
      </CardHeader>
      <CardContent className='px-3 pt-3 pb-4'>
        <div className='space-y-1'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center rounded-xl px-2.5 py-2.5'>
              <Skeleton className='size-9 rounded-xl' />
              <div className='ml-3 flex-1 space-y-1.5'>
                <Skeleton className='h-4 w-[140px]' />
                <Skeleton className='h-3 w-[100px]' />
              </div>
              <Skeleton className='ml-2 h-5 w-[60px] rounded-full' />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
