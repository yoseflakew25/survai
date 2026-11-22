'use client';

import { Suspense } from 'react';
import { useTranslations } from 'next-intl';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { panelWashClass } from '@/components/survai-panel';
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
  const t = useTranslations('respondents');
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
        showCloseButton={false}
        className='w-full gap-0 overflow-hidden border-l border-border bg-background p-0 sm:!w-1/2 sm:!max-w-[50vw]'
      >
        <SheetHeader className='sr-only'>
          <SheetTitle>{t('detailTitle')}</SheetTitle>
          <SheetDescription>{t('detailDescription')}</SheetDescription>
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
      <div className={panelWashClass}>
        <div className='relative px-4 py-3.5 pr-12 sm:px-5 sm:pr-14'>
          <div className='flex flex-col gap-3 sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] sm:gap-5'>
            <div className='min-w-0 space-y-2'>
              <Skeleton className='h-6 w-44 max-w-full rounded-none' />
              <Skeleton className='h-3 w-full max-w-xs rounded-none' />
              <Skeleton className='h-3 w-full max-w-sm rounded-none' />
            </div>
            <div className='grid w-full grid-cols-2 gap-2 min-[480px]:grid-cols-3'>
              <Skeleton className='h-[3.25rem] rounded-none' />
              <Skeleton className='h-[3.25rem] rounded-none' />
              <Skeleton className='col-span-2 h-[3.25rem] min-[480px]:col-span-1 rounded-none' />
            </div>
          </div>
          <Skeleton className='absolute top-3.5 right-4 size-8 rounded-none sm:right-5' />
        </div>
      </div>
      <div className='space-y-3 bg-background px-4 py-4 sm:px-5'>
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className='overflow-hidden rounded-none border border-border bg-card'
          >
            <div className='border-b border-border bg-[color-mix(in_srgb,var(--brand)_72%,var(--background))] px-3.5 py-2.5'>
              <Skeleton className='h-4 w-40 rounded-none' />
            </div>
            <div className='space-y-2.5 p-3.5'>
              <Skeleton className='h-4 w-full rounded-none' />
              <Skeleton className='h-8 w-28 rounded-none' />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}