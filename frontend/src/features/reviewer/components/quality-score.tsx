'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScoreCriterion } from '../api/types';

interface QualityScoreProps {
  score: number;
  criteria: ScoreCriterion[];
  estimatedMinutes: number;
  requiredQuestionCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 4.0) return 'text-brand-strong';
  if (score >= 3.0) return 'text-[color-mix(in_srgb,var(--gold)_85%,var(--foreground))]';
  return 'text-destructive';
}

function getScoreLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Good';
  if (score >= 3.5) return 'Fair';
  if (score >= 3.0) return 'Needs Work';
  return 'Poor';
}

function getScoreStroke(score: number): string {
  if (score >= 4.0) return 'stroke-brand';
  if (score >= 3.0) return 'stroke-[var(--gold)]';
  return 'stroke-destructive';
}

function getCriterionFill(score: number): string {
  if (score >= 4.0) return 'bg-brand';
  if (score >= 3.0) return 'bg-[var(--gold)]';
  return 'bg-destructive';
}

export function QualityScore({
  score,
  criteria,
  estimatedMinutes,
  requiredQuestionCount
}: QualityScoreProps) {
  const percentage = (score / 5) * 100;
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className='border-border bg-card overflow-hidden rounded-2xl border shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
      <div className='border-border space-y-1 border-b px-5 py-4'>
        <h3 className='font-display text-lg font-extrabold tracking-tight text-foreground'>
          Quality Assessment
        </h3>
        <p className='text-muted-foreground text-xs leading-relaxed'>
          Advisory score from the latest AI review
        </p>
      </div>

      <div className='space-y-5 p-5'>
        <div className='flex items-center gap-5'>
          <div className='relative shrink-0'>
            <svg className='size-28 -rotate-90' viewBox='0 0 100 100'>
              <circle
                cx='50'
                cy='50'
                r='42'
                fill='none'
                strokeWidth='7'
                className='stroke-[color-mix(in_srgb,var(--foreground)_10%,transparent)]'
              />
              <circle
                cx='50'
                cy='50'
                r='42'
                fill='none'
                strokeWidth='7'
                strokeLinecap='round'
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(
                  getScoreStroke(score),
                  'transition-[stroke-dashoffset] duration-700 ease-out'
                )}
              />
            </svg>
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <span
                className={cn(
                  'font-display text-2xl font-extrabold tracking-tight tabular-nums',
                  getScoreColor(score)
                )}
              >
                {score.toFixed(1)}
              </span>
              <span className='text-muted-foreground font-mono text-[10px] tabular-nums'>
                / 5.0
              </span>
            </div>
          </div>

          <div className='min-w-0 flex-1 space-y-3'>
            <div>
              <p
                className={cn(
                  'font-display text-xl font-extrabold tracking-tight',
                  getScoreColor(score)
                )}
              >
                {getScoreLabel(score)}
              </p>
              <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                Overall quality advisory score
              </p>
            </div>

            <div className='grid grid-cols-2 gap-2'>
              <div className='bg-secondary/70 rounded-xl px-2.5 py-2'>
                <p className='font-display text-sm font-bold tracking-tight tabular-nums'>
                  {estimatedMinutes} min
                </p>
                <p className='text-muted-foreground text-[10px]'>Est. time</p>
              </div>
              <div className='bg-secondary/70 rounded-xl px-2.5 py-2'>
                <p className='font-display text-sm font-bold tracking-tight tabular-nums'>
                  {requiredQuestionCount}
                </p>
                <p className='text-muted-foreground text-[10px]'>Required</p>
              </div>
            </div>
          </div>
        </div>

        <Badge
          variant='secondary'
          className='rounded-full border-transparent bg-secondary text-[10px] font-medium'
        >
          Advisory only — not a certification
        </Badge>

        <div className='border-border space-y-4 border-t pt-4'>
          <p className='text-muted-foreground text-[11px] font-semibold tracking-wide uppercase'>
            Score breakdown
          </p>
          {criteria.map((criterion) => (
            <div key={criterion.label} className='space-y-1.5'>
              <div className='flex items-baseline justify-between gap-3'>
                <span className='text-sm font-medium text-foreground'>
                  {criterion.label}
                </span>
                <span
                  className={cn(
                    'font-display text-sm font-bold tabular-nums',
                    getScoreColor(criterion.score)
                  )}
                >
                  {criterion.score.toFixed(1)}
                </span>
              </div>
              <div className='bg-secondary h-1.5 w-full overflow-hidden rounded-full'>
                <div
                  className={cn(
                    'h-full rounded-full transition-[width] duration-700 ease-out',
                    getCriterionFill(criterion.score)
                  )}
                  style={{ width: `${(criterion.score / 5) * 100}%` }}
                />
              </div>
              <p className='text-muted-foreground text-[11px] leading-relaxed'>
                {criterion.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
