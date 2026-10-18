import { cn } from '@/lib/utils';

type MarkProps = {
  className?: string;
  /** Soft watermark: brand tile only, no ink bars (reads better at huge scale). */
  ghost?: boolean;
};

/** Polished Survai mark — lime rounded tile, survey bars, verified check. */
export function SurvaiMark({ className, ghost = false }: MarkProps) {
  return (
    <svg
      viewBox='0 0 40 40'
      fill='none'
      xmlns='http://www.w3.org/2000/svg'
      className={className}
      aria-hidden='true'
    >
      <rect x='1' y='3' width='34' height='34' rx='10' fill='var(--brand, #c6f432)' />
      {/* Survey lines — short / long / medium, matching the approved mark */}
      <rect
        x='8'
        y='12.5'
        width='14'
        height='3.25'
        rx='1.6'
        fill={ghost ? 'currentColor' : 'var(--foreground, #111210)'}
        opacity={ghost ? 0.55 : 1}
      />
      <rect
        x='8'
        y='18.75'
        width='20'
        height='3.25'
        rx='1.6'
        fill={ghost ? 'currentColor' : 'var(--foreground, #111210)'}
        opacity={ghost ? 0.55 : 1}
      />
      <rect
        x='8'
        y='25'
        width='11'
        height='3.25'
        rx='1.6'
        fill={ghost ? 'currentColor' : 'var(--foreground, #111210)'}
        opacity={ghost ? 0.55 : 1}
      />
      <circle
        cx='31.5'
        cy='8.5'
        r='7'
        fill={ghost ? 'currentColor' : 'var(--foreground, #111210)'}
        opacity={ghost ? 0.75 : 1}
      />
      <path
        d='M28.6 8.55l1.85 1.85 4.1-4.15'
        stroke='var(--background, #f7f7f2)'
        strokeWidth='2.1'
        strokeLinecap='round'
        strokeLinejoin='round'
      />
    </svg>
  );
}

type LogoProps = {
  className?: string;
  markClassName?: string;
  wordmarkClassName?: string;
  href?: string;
};

/** Mark + lowercase “survai” wordmark, Launchpot-style chrome. */
export function SurvaiLogo({
  className,
  markClassName,
  wordmarkClassName
}: LogoProps) {
  return (
    <span
      className={cn(
        'font-display inline-flex items-center gap-1.5 text-xl font-extrabold tracking-[-0.045em] text-foreground',
        className
      )}
    >
      <SurvaiMark className={cn('h-[1.35em] w-auto shrink-0', markClassName)} />
      <span className={wordmarkClassName}>survai</span>
    </span>
  );
}
