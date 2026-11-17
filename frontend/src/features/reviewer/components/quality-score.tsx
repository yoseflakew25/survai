'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { ScoreCriterion } from '../api/types';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { useTranslations } from 'next-intl';

type ScoreTier = 'excellent' | 'good' | 'fair' | 'needsWork' | 'poor';

interface QualityScoreProps {
  score: number;
  criteria: ScoreCriterion[];
  estimatedMinutes: number;
  requiredQuestionCount: number;
}

function getScoreTone(score: number): {
  tier: ScoreTier;
  text: string;
  chip: string;
  bar: string;
} {
  if (score >= 4.0) {
    return {
      tier: score >= 4.5 ? 'excellent' : 'good',
      text: 'text-brand-strong',
      chip: 'border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground',
      bar: 'bg-brand'
    };
  }
  if (score >= 3.0) {
    return {
      tier: score >= 3.5 ? 'fair' : 'needsWork',
      text: 'text-amber-700 dark:text-amber-300',
      chip: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200',
      bar: 'bg-amber-500'
    };
  }
  return {
    tier: 'poor',
    text: 'text-destructive',
    chip: 'border-destructive/30 bg-destructive/10 text-destructive',
    bar: 'bg-destructive'
  };
}

export function QualityScore({
  score,
  criteria,
  estimatedMinutes,
  requiredQuestionCount
}: QualityScoreProps) {
  const t = useTranslations('review');
  const tCommon = useTranslations('common');
  const tone = getScoreTone(score);

  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        // icon={<Icons.analytics className='size-3.5' />}
        title={t('qualityAssessment')}
        subtitle={t('qualitySubtitle')}
        badge={
          <Badge
            variant='secondary'
            className={cn(
              'rounded-full border text-[10px] font-semibold',
              tone.chip
            )}
          >
            {t(tone.tier)}
          </Badge>
        }
      />

      <SurvaiPanelBody className='space-y-4'>
        <div className='flex items-end justify-between gap-3'>
          <div>
            <p
              className={cn(
                'font-display text-4xl font-extrabold tracking-tight tabular-nums',
                tone.text
              )}
            >
              {score.toFixed(1)}
              <span className='text-muted-foreground ml-1 font-mono text-sm font-medium'>
                / 5
              </span>
            </p>
            <p className='text-muted-foreground  text-xs leading-relaxed'>
              {t('overallAdvisory')}
            </p>
          </div>
          <div className='flex gap-2'>
            <div className='rounded-xl border border-border bg-secondary/70 px-2.5 py-2 text-right'>
              <p className='font-display text-sm font-bold tracking-tight tabular-nums'>
                {t('minutesShort', { count: estimatedMinutes })}
              </p>
              <p className='text-muted-foreground text-[10px]'>{t('estTime')}</p>
            </div>
            <div className='rounded-xl border border-border bg-secondary/70 px-2.5 py-2 text-right'>
              <p className='font-display text-sm font-bold tracking-tight tabular-nums'>
                {requiredQuestionCount}
              </p>
              <p className='text-muted-foreground text-[10px]'>{tCommon('required')}</p>
            </div>
          </div>
        </div>

        <Badge
          variant='secondary'
          className='rounded-full border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft text-[10px] font-medium text-foreground'
        >
          {t('advisoryBadge')}
        </Badge>

        <div className='overflow-hidden rounded-xl border border-border'>
          {criteria.map((criterion, i) => {
            const cTone = getScoreTone(criterion.score);
            return (
              <div
                key={criterion.label}
                className={cn(
                  'space-y-2 px-3 py-3',
                  i > 0 && 'border-t border-border',
                  criterion.score >= 4 && 'bg-brand-soft/40'
                )}
              >
                <div className='flex items-baseline justify-between gap-3'>
                  <span className='text-sm font-semibold tracking-tight text-foreground'>
                    {criterion.label}
                  </span>
                  <span
                    className={cn(
                      'font-display text-sm font-extrabold tabular-nums',
                      cTone.text
                    )}
                  >
                    {criterion.score.toFixed(1)}
                  </span>
                </div>
                <div className='bg-secondary h-1.5 w-full overflow-hidden rounded-full'>
                  <div
                    className={cn(
                      'h-full rounded-full transition-[width] duration-700 ease-out',
                      cTone.bar
                    )}
                    style={{ width: `${(criterion.score / 5) * 100}%` }}
                  />
                </div>
                <p className='text-muted-foreground text-[11px] leading-relaxed'>
                  {criterion.description}
                </p>
              </div>
            );
          })}
        </div>
      </SurvaiPanelBody>
    </SurvaiPanel>
  );
}
