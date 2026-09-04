import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function RecentSurveysSkeleton() {
  return (
    <Card className='h-full'>
      <CardHeader>
        <Skeleton className='h-6 w-[160px]' />
        <Skeleton className='h-4 w-[180px]' />
      </CardHeader>
      <CardContent>
        <div className='space-y-4'>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className='flex items-center'>
              <Skeleton className='size-9 rounded-lg' />
              <div className='ml-4 flex-1 space-y-1'>
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
