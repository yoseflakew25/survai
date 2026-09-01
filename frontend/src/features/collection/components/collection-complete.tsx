'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface CollectionCompleteProps {
  title: string;
}

export function CollectionComplete({ title }: CollectionCompleteProps) {
  return (
    <div className='mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center bg-background p-4 sm:p-6'>
      <Card className='w-full'>
        <CardContent className='flex flex-col items-center py-12 text-center'>
          {/* Success icon */}
          <div className='bg-primary/10 mb-6 flex size-16 items-center justify-center rounded-full'>
            <Icons.circleCheck className='text-primary size-8' />
          </div>

          <h1 className='mb-2 text-xl font-bold tracking-tight'>
            Thank you!
          </h1>

          <p className='text-muted-foreground mb-1 text-sm'>
            Your responses to <span className='font-medium text-foreground'>{title}</span>{' '}
            have been recorded.
          </p>

          <p className='text-muted-foreground mb-8 text-xs'>
            Your answers are anonymous and will help improve services in your community.
          </p>

          {/* Decorative divider */}
          <div className='flex items-center gap-2 text-muted-foreground/30'>
            <div className='h-px w-12 bg-current' />
            <Icons.sparkles className='size-3' />
            <div className='h-px w-12 bg-current' />
          </div>
        </CardContent>
      </Card>

      <p className='text-muted-foreground mt-6 text-center text-[10px]'>
        Powered by Survey Copilot — AI-Powered Survey Lifecycle Platform
      </p>
    </div>
  );
}
