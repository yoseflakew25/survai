'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';

interface CollectionCompleteProps {
  title: string;
  answeredCount: number;
  totalQuestions: number;
  submittedAt: string;
  onReset: () => void;
}

function formatSubmittedAt(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });
}

export function CollectionComplete({
  title,
  answeredCount,
  totalQuestions,
  submittedAt,
  onReset
}: CollectionCompleteProps) {
  return (
    <div className='flex min-h-dvh flex-col bg-white'>
      <main className='mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6'>
        <div className='overflow-hidden rounded-xl border border-border bg-white shadow-sm'>
          <div className='border-b border-border bg-white px-6 py-4 text-center'>
            <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
              Response recorded
            </p>
          </div>

          <div className='flex flex-col items-center px-6 py-10 text-center sm:px-10'>
            {/* Success mark */}
            <div className='relative mb-6 flex items-center justify-center'>
              <span className='bg-primary/10 absolute size-20 animate-ping rounded-full opacity-50 [animation-duration:2s]' />
              <div className='bg-primary relative flex size-16 items-center justify-center rounded-full shadow-sm'>
                <Icons.check className='text-primary-foreground size-7' />
              </div>
            </div>

            <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
              Thank you for your response!
            </h1>
            <p className='text-muted-foreground mt-2 max-w-md text-sm leading-relaxed'>
              Your answers to{' '}
              <span className='text-foreground font-medium'>{title}</span> have
              been recorded successfully.
            </p>

            {/* Summary chips */}
            <div className='mt-6 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs'>
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Icons.circleCheck className='text-primary size-3.5' />
                {answeredCount} of {totalQuestions} questions answered
              </span>
              <span className='bg-muted-foreground/30 size-1 rounded-full' />
              <span className='text-muted-foreground flex items-center gap-1.5'>
                <Icons.clock className='text-primary size-3.5' />
                {formatSubmittedAt(submittedAt)}
              </span>
            </div>

            <div className='bg-muted/50 text-muted-foreground mt-7 flex w-full max-w-sm items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-[11px]'>
              <Icons.lock className='size-3.5' />
              Submitted anonymously — no identifying details were collected.
            </div>

            <Button variant='outline' onClick={onReset} className='mt-6 shadow-none'>
              <Icons.forms className='mr-1.5 size-3.5' />
              Submit another response
            </Button>
          </div>
        </div>

        <p className='text-muted-foreground mt-6 text-center text-[11px]'>
          Powered by{' '}
          <span className='text-primary inline-flex items-center gap-1 font-medium'>
            <Icons.sparkles className='size-3' />
            Survai
          </span>
        </p>
      </main>
    </div>
  );
}
