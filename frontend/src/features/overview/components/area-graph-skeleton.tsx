import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function AreaGraphSkeleton() {
  return (
    <Card className='gap-0 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card py-0'>
      <CardHeader className='border-b border-[color-mix(in_srgb,var(--brand)_25%,var(--border))] bg-muted/25 px-5 py-4'>
        <div className='flex items-center gap-2'>
          <Skeleton className='h-6 w-[140px]' />
          <Skeleton className='h-5 w-[60px] rounded-full' />
        </div>
        <Skeleton className='mt-2 h-4 w-[250px]' />
      </CardHeader>
      <CardContent className='px-4 pt-4 pb-5'>
          <div className='relative aspect-auto h-[380px] w-full'>
          <div className='absolute inset-0 rounded-lg bg-brand-soft/30' />
          <Skeleton className='absolute right-0 bottom-0 left-0 h-[1px]' />
          <Skeleton className='absolute top-0 bottom-0 left-0 w-[1px]' />
        </div>
      </CardContent>
    </Card>
  );
}
