'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { ScoreCriterion } from '../api/types';

interface QualityScoreProps {
  score: number;
  criteria: ScoreCriterion[];
  estimatedMinutes: number;
  requiredQuestionCount: number;
}

function getScoreColor(score: number): string {
  if (score >= 4.0) return 'text-emerald-600 dark:text-emerald-400';
  if (score >= 3.0) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getScoreLabel(score: number): string {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4.0) return 'Good';
  if (score >= 3.5) return 'Fair';
  if (score >= 3.0) return 'Needs Work';
  return 'Poor';
}

function getScoreBg(score: number): string {
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= 3.0) return 'bg-amber-500';
  return 'bg-red-500';
}

function getCriterionColor(score: number): string {
  if (score >= 4.0) return 'bg-emerald-500';
  if (score >= 3.0) return 'bg-amber-500';
  return 'bg-red-500';
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
    <Card>
      <CardHeader>
        <CardTitle className='text-base'>Quality Assessment</CardTitle>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* Radial score */}
        <div className='flex items-center gap-6'>
          <div className='relative'>
            <svg className='size-28 -rotate-90' viewBox='0 0 100 100'>
              {/* Background circle */}
              <circle
                cx='50'
                cy='50'
                r='42'
                fill='none'
                stroke='currentColor'
                strokeWidth='8'
                className='text-muted/30'
              />
              {/* Score arc */}
              <circle
                cx='50'
                cy='50'
                r='42'
                fill='none'
                strokeWidth='8'
                strokeLinecap='round'
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className={cn(getScoreBg(score), 'transition-all duration-1000')}
              />
            </svg>
            <div className='absolute inset-0 flex flex-col items-center justify-center'>
              <span className={cn('text-2xl font-bold', getScoreColor(score))}>
                {score.toFixed(1)}
              </span>
              <span className='text-muted-foreground text-[10px]'>/ 5.0</span>
            </div>
          </div>

          <div className='flex-1 space-y-2'>
            <div>
              <p className={cn('text-lg font-semibold', getScoreColor(score))}>
                {getScoreLabel(score)}
              </p>
              <p className='text-muted-foreground text-xs'>
                Overall quality advisory score
              </p>
            </div>
            <div className='flex gap-4 text-sm'>
              <div>
                <p className='font-medium'>{estimatedMinutes} min</p>
                <p className='text-muted-foreground text-xs'>Est. time</p>
              </div>
              <div>
                <p className='font-medium'>{requiredQuestionCount}</p>
                <p className='text-muted-foreground text-xs'>Required</p>
              </div>
            </div>
          </div>
        </div>

        <Badge variant='secondary' className='text-xs'>
          Advisory only — not a certification
        </Badge>

        <Separator />

        {/* Criteria breakdown */}
        <div className='space-y-3'>
          <p className='text-muted-foreground text-xs font-medium uppercase tracking-wide'>
            Score Breakdown
          </p>
          {criteria.map((criterion) => (
            <div key={criterion.label} className='space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-sm'>{criterion.label}</span>
                <span className={cn('text-sm font-medium', getScoreColor(criterion.score))}>
                  {criterion.score.toFixed(1)}
                </span>
              </div>
              <div className='bg-muted h-1.5 w-full overflow-hidden rounded-full'>
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-700',
                    getCriterionColor(criterion.score)
                  )}
                  style={{ width: `${(criterion.score / 5) * 100}%` }}
                />
              </div>
              <p className='text-muted-foreground text-[10px]'>
                {criterion.description}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
