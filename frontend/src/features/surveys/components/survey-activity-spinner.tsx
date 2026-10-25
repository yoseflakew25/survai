'use client';

import { cn } from '@/lib/utils';

type SurveyActivitySpinnerProps = {
  className?: string;
};

/** Simple ring spinner — sits on the brand hero, no tile behind it. */
export function SurveyActivitySpinner({
  className
}: SurveyActivitySpinnerProps) {
  return (
    <div
      className={cn('relative size-12', className)}
      role='status'
      aria-label='Loading'
    >
      <svg
        viewBox='0 0 48 48'
        className='size-full animate-spin'
        fill='none'
        aria-hidden
      >
        <circle
          cx='24'
          cy='24'
          r='18'
          stroke='currentColor'
          strokeOpacity='0.18'
          strokeWidth='3'
        />
        <path
          d='M42 24a18 18 0 0 0-18-18'
          stroke='currentColor'
          strokeWidth='3'
          strokeLinecap='round'
        />
      </svg>
    </div>
  );
}
