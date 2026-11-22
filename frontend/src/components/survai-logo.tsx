import { cn } from '@/lib/utils';

const MINT = 'var(--survai-mint-strong, #0f9f5c)';

type MarkProps = {
  className?: string;
  ghost?: boolean;
};

/**
 * Compact mark for icon slots — mint “ai”.
 */
export function SurvaiMark({ className, ghost = false }: MarkProps) {
  return (
    <svg
      viewBox='0 0 40 28'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden='true'
    >
      <text
        x='20'
        y='22'
        textAnchor='middle'
        fill={ghost ? 'currentColor' : MINT}
        style={{ fontFamily: 'var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif' }}
        fontSize='22'
        fontWeight='700'
        letterSpacing='-1.4'
        opacity={ghost ? 0.85 : 1}
      >
        ai
      </text>
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  onDark?: boolean;
  href?: string;
};

/** Wordmark: surv (ink) + ai (mint). */
export function SurvaiLogo({
  className,
  wordmarkClassName,
  onDark = false
}: LogoProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline text-[1.25rem] font-semibold tracking-[-0.07em] leading-none lowercase',
        onDark ? 'text-white' : 'text-[var(--survai-ink,#232323)]',
        className
      )}
      aria-label='survai'
    >
      <span className={cn('inline-flex', wordmarkClassName)} aria-hidden='true'>
        <span>surv</span>
        <span className='text-[var(--survai-mint-strong,#0f9f5c)]'>ai</span>
      </span>
    </span>
  );
}

type LockupSvgProps = {
  className?: string;
  onDark?: boolean;
};

/** Footer / export wordmark — surv + mint ai as one text run (no fixed x overlap). */
export function SurvaiLockup({ className, onDark = false }: LockupSvgProps) {
  const ink = onDark ? '#ffffff' : '#232323';
  const mint = '#0f9f5c';

  return (
    <svg
      viewBox='0 0 148 40'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      role='img'
      aria-label='survai'
    >
      <text
        x='0'
        y='32'
        style={{ fontFamily: 'var(--font-plex-sans), ui-sans-serif, system-ui, sans-serif' }}
        fontSize='40'
        fontWeight='600'
        letterSpacing='-0.5'
      >
        <tspan fill={ink}>surv</tspan>
        <tspan fill={mint} dx='2'>
          ai
        </tspan>
      </text>
    </svg>
  );
}
