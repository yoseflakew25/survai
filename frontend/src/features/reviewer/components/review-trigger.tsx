'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import { triggerReview } from '../api/service';
import type { ReviewerReport } from '../api/types';
import { useTranslations } from 'next-intl';

interface ReviewTriggerProps {
  surveyId: string;
  existingReport: ReviewerReport | null;
  onReviewComplete: (report: ReviewerReport) => void;
}

export function ReviewTrigger({
  surveyId,
  existingReport,
  onReviewComplete
}: ReviewTriggerProps) {
  const t = useTranslations('review');
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = useCallback(async () => {
    setIsReviewing(true);
    try {
      const report = await triggerReview(surveyId);
      onReviewComplete(report);
      toast.success(t('reviewComplete'), {
        description: t('foundIssues', { count: report.findings.length })
      });
    } catch {
      toast.error(t('reviewFailed'), {
        description: t('reviewFailedDesc')
      });
    } finally {
      setIsReviewing(false);
    }
  }, [surveyId, onReviewComplete, t]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>{t('aiReview')}</CardTitle>
            <CardDescription>
              {t('aiReviewDesc')}
            </CardDescription>
          </div>
          {existingReport && !isReviewing && (
            <Badge variant='secondary'>
              {t('findingsBadge', { count: existingReport.findings.length })}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className='space-y-3'>
        <Button
          className='w-full'
          onClick={handleReview}
          disabled={isReviewing}
        >
          {isReviewing ? (
            <>
              <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              {t('analyzing')}
            </>
          ) : (
            <>
              <Icons.review className='mr-2 h-4 w-4' />
              {existingReport ? t('reReview') : t('runReview')}
            </>
          )}
        </Button>

        {isReviewing && (
          <div className='space-y-2'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              {t('checkingLeading')}
            </div>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              {t('detectingDouble')}
            </div>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              {t('evaluatingAlignment')}
            </div>
          </div>
        )}

        {!isReviewing && (
          <p className='text-muted-foreground text-xs'>
            {t('reviewExplain')}
          </p>
        )}

        {/* Generation meta */}
        {existingReport?.aiGenerationMeta && !isReviewing && (
          <>
            <Separator />
            <div className='space-y-1 text-xs text-muted-foreground'>
              <p>
                {t('modelLabel')}{' '}
                <span className='font-mono'>
                  {existingReport.aiGenerationMeta.model}
                </span>
              </p>
              <p>
                {t('promptVersion')}{' '}
                <span className='font-mono'>
                  {existingReport.aiGenerationMeta.promptVersion}
                </span>
              </p>
              <p>
                {t('latency')}{' '}
                <span className='font-mono'>
                  {existingReport.aiGenerationMeta.latencyMs}ms
                </span>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
