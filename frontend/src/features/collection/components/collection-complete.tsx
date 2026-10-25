'use client';

import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import {
  displaySurveyDescription,
  displaySurveyTitle
} from '@/lib/survey-display';

interface CollectionCompleteProps {
  title: string;
  description?: string | null;
  answeredCount: number;
  totalQuestions: number;
  submittedAt: string;
  collectsIdentity?: boolean;
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
  description,
  answeredCount,
  totalQuestions,
  submittedAt,
  collectsIdentity = true,
  onReset
}: CollectionCompleteProps) {
  const displayTitle = displaySurveyTitle(title);
  const displayDescription = displaySurveyDescription(title, description);

  return (
    <div className='flex min-h-dvh flex-col bg-background'>
      <main className='mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6'>
        {/* Brand success hero — matches collect form SurvaiBrandCard chrome */}
        <div className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
          <div
            className='pointer-events-none absolute inset-0 opacity-40'
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              maskImage:
                'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 18%, black 82%, transparent)'
            }}
          />

          <div className='relative flex flex-col items-center px-6 py-10 text-center sm:px-10 sm:py-12'>
            <p className='mb-5 inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2.5 py-1 font-mono text-[10px] font-semibold tracking-wide text-foreground uppercase'>
              <span className='size-1.5 animate-pulse rounded-full bg-foreground' />
              Response recorded
            </p>

            <div className='relative mb-6 flex items-center justify-center'>
              <span className='absolute size-[4.5rem] animate-ping rounded-full bg-foreground/10 [animation-duration:2.2s]' />
              <div className='relative flex size-14 items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground text-background shadow-sm'>
                <Icons.check className='size-7' strokeWidth={2.5} />
              </div>
            </div>

            <h1 className='font-display text-2xl font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.75rem]'>
              Thank you for your response
            </h1>
            <p className='mt-2 max-w-md text-sm leading-relaxed text-foreground/75'>
              Your answers to{' '}
              <span className='font-semibold text-foreground'>
                {displayTitle}
              </span>{' '}
              have been recorded successfully.
            </p>
            {displayDescription ? (
              <p className='text-foreground/60 mt-1.5 line-clamp-2 max-w-sm text-xs leading-relaxed'>
                {displayDescription}
              </p>
            ) : null}

            <div className='mt-7 flex flex-wrap items-center justify-center gap-2'>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2.5 py-1 text-[11px] font-medium text-foreground'>
                <Icons.circleCheck className='size-3 opacity-80' />
                {answeredCount} of {totalQuestions} answered
              </span>
              <span className='inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2.5 py-1 text-[11px] font-medium text-foreground'>
                <Icons.clock className='size-3 opacity-80' />
                {formatSubmittedAt(submittedAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Follow-up card */}
        <div className='mt-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm'>
          <div className='flex items-start gap-3 px-5 py-4'>
            <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-foreground'>
              <Icons.lock className='size-4' />
            </div>
            <div className='min-w-0'>
              <p className='font-display text-sm font-bold tracking-tight text-foreground'>
                {collectsIdentity ? 'Details received' : 'Submitted securely'}
              </p>
              <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                {collectsIdentity
                  ? 'Contact details are visible only to the survey organizer and are used for this research only.'
                  : 'No identifying details were collected with this response.'}
              </p>
            </div>
          </div>

          <div className='border-t border-border px-5 py-3'>
            <Button
              onClick={onReset}
              className='w-full rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground shadow-none hover:brightness-105'
            >
              <Icons.forms className='mr-1.5 size-3.5' />
              Submit another response
            </Button>
          </div>
        </div>

        <p className='text-muted-foreground mt-6 flex items-center justify-center gap-1.5 text-center text-[11px]'>
          Powered by
          <span className='inline-flex items-center gap-1 font-medium text-foreground'>
            <Icons.sparkles className='size-3 text-[color:var(--brand-strong)]' />
            Survai
          </span>
        </p>
      </main>
    </div>
  );
}
