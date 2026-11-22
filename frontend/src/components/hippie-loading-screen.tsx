'use client';

import { SurvaiLogo } from '@/components/survai-logo';

import './survai-loading-screen.css';

type SurvaiLoadingScreenProps = {
  /** Short status line (screen readers + visible). */
  message?: string;
  /** Embed inside a layout instead of full viewport. */
  compact?: boolean;
};

/**
 * Full-screen loading — quiet paper field, brand mark, one motion.
 */
export function SurvaiLoadingScreen({
  message = 'Loading…',
  compact = false
}: SurvaiLoadingScreenProps) {
  return (
    <div
      className={compact ? 'sv-load sv-load--compact' : 'sv-load'}
      role='status'
      aria-live='polite'
      aria-busy='true'
      aria-label={message}
    >
      <div className='sv-load-wash' aria-hidden='true' />

      <main className='sv-load-main'>
        <div className='sv-load-cluster'>
          <SurvaiLogo className='sv-load-mark' wordmarkClassName='sv-load-word' />
          <div className='sv-load-track' aria-hidden='true'>
            <span className='sv-load-bar' />
          </div>
          <p className='sv-load-message' suppressHydrationWarning>
            {message}
          </p>
        </div>
      </main>
    </div>
  );
}

type SurvaiLoadingInlineProps = {
  message: string;
  className?: string;
};

/** Compact loader for auth shell and other in-layout waits. */
export function SurvaiLoadingInline({ message, className }: SurvaiLoadingInlineProps) {
  return (
    <div
      className={className ? `sv-load-inline ${className}` : 'sv-load-inline'}
      role='status'
      aria-live='polite'
      aria-busy='true'
      aria-label={message}
    >
      <div className='sv-load-track' aria-hidden='true'>
        <span className='sv-load-bar' />
      </div>
      <p className='sv-load-message' suppressHydrationWarning>
        {message}
      </p>
    </div>
  );
}

/** @deprecated Use SurvaiLoadingScreen — kept for existing imports. */
export const HippieLoadingScreen = SurvaiLoadingScreen;

export default SurvaiLoadingScreen;
