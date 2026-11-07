import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AreaGraphSkeleton() {
  return (
    <Card className='gap-0 rounded-[1.125rem] border border-border bg-card py-0 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent),0_6px_20px_-16px_color-mix(in_srgb,var(--foreground)_14%,transparent)]'>
      <CardHeader className='border-b border-border bg-brand-soft px-5 py-4'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-6 w-[140px]' />
          <Skeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <Skeleton className='mt-2 h-4 w-[250px]' />
      </CardHeader>
      <CardContent className='px-4 pt-4 pb-5'>
          <div className='relative aspect-auto h-[380px] w-full'>
          <div className='absolute inset-0 rounded-lg bg-muted/30' />
          <Skeleton className='absolute right-0 bottom-0 left-0 h-[1px]' />
          <Skeleton className='absolute top-0 bottom-0 left-0 w-[1px]' />
        </div>
      </CardContent>
    </Card>
  );
}
