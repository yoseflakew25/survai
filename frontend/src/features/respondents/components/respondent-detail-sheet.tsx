'use client';

import { Suspense } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { RespondentDetailView } from './respondent-detail-view';

interface RespondentDetailSheetProps {
  surveyId: string;
  respondentId: string | null;
  onClose: () => void;
}

export function RespondentDetailSheet({
  surveyId,
  respondentId,
  onClose
}: RespondentDetailSheetProps) {
  const open = Boolean(respondentId);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <SheetContent
        side='right'
        showCloseButton
        className='w-full gap-0 overflow-hidden border-l border-border bg-background p-0 sm:!w-1/2 sm:!max-w-[50vw]'
      >
        <SheetHeader className='sr-only'>
          <SheetTitle>Respondent details</SheetTitle>
          <SheetDescription>
            Survey answers and submission details for this respondent.
          </SheetDescription>
        </SheetHeader>

        <div className='flex h-full min-h-0 flex-col overflow-hidden'>
          {respondentId ? (
            <Suspense
              key={respondentId}
              fallback={<RespondentDetailSheetSkeleton />}
            >
              <div className='min-h-0 flex-1 overflow-y-auto'>
                <RespondentDetailView
                  surveyId={surveyId}
                  respondentId={respondentId}
                  variant='drawer'
                />
              </div>
            </Suspense>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function RespondentDetailSheetSkeleton() {
  return (
    <div>
      <div className='border-b border-border bg-card px-4 pt-4 pr-12 pb-3 sm:px-5'>
        <div className='flex items-center gap-3'>
          <Skeleton className='size-11 shrink-0 rounded-xl' />
          <div className='min-w-0 flex-1 space-y-1.5'>
            <Skeleton className='h-5 w-44 rounded' />
            <Skeleton className='h-3.5 w-64 max-w-full rounded' />
          </div>
        </div>
        <div className='mt-3 grid grid-cols-3 gap-2'>
          <Skeleton className='h-12 rounded-xl' />
          <Skeleton className='h-12 rounded-xl' />
          <Skeleton className='h-12 rounded-xl' />
        </div>
      </div>
      <div className='flex items-center gap-3 border-b border-border bg-muted/40 px-4 py-2 sm:px-5'>
        <Skeleton className='h-3 w-16 rounded' />
        <Skeleton className='h-1.5 min-w-0 flex-1 rounded-full' />
        <Skeleton className='h-3 w-8 rounded' />
      </div>
      <div className='space-y-3 px-4 py-4 sm:px-5'>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className='overflow-hidden rounded-2xl border border-border bg-card'
          >
            <div className='border-b border-border bg-muted/30 px-3.5 py-2.5'>
              <Skeleton className='h-4 w-40 rounded' />
            </div>
            <div className='space-y-2.5 p-3.5'>
              <Skeleton className='h-4 w-full rounded' />
              <Skeleton className='h-6 w-24 rounded-full' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
