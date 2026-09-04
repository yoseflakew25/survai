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
  const [isReviewing, setIsReviewing] = useState(false);

  const handleReview = useCallback(async () => {
    setIsReviewing(true);
    try {
      const report = await triggerReview(surveyId);
      onReviewComplete(report);
      toast.success('Review complete', {
        description: `Found ${report.findings.length} potential issues.`
      });
    } catch {
      toast.error('Review failed', {
        description: 'AI could not complete the review. Please try again.'
      });
    } finally {
      setIsReviewing(false);
    }
  }, [surveyId, onReviewComplete]);

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>AI Review</CardTitle>
            <CardDescription>
              Analyze questions for wording issues, ambiguity, and alignment
            </CardDescription>
          </div>
          {existingReport && !isReviewing && (
            <Badge variant='secondary'>
              {existingReport.findings.length} findings
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
              Analyzing questions…
            </>
          ) : (
            <>
              <Icons.review className='mr-2 h-4 w-4' />
              {existingReport ? 'Re-run Review' : 'Run AI Review'}
            </>
          )}
        </Button>

        {isReviewing && (
          <div className='space-y-2'>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              Checking for leading wording…
            </div>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              Detecting double-barreled questions…
            </div>
            <div className='text-muted-foreground flex items-center gap-2 text-xs'>
              <Icons.spinner className='h-3 w-3 animate-spin' />
              Evaluating objective alignment…
            </div>
          </div>
        )}

        {!isReviewing && (
          <p className='text-muted-foreground text-xs'>
            The AI checks each question for common quality issues: leading
            wording, double-barreled questions, ambiguity, and alignment with
            your research objectives.
          </p>
        )}

        {/* Generation meta */}
        {existingReport?.aiGenerationMeta && !isReviewing && (
          <>
            <Separator />
            <div className='space-y-1 text-xs text-muted-foreground'>
              <p>
                Model:{' '}
                <span className='font-mono'>
                  {existingReport.aiGenerationMeta.model}
                </span>
              </p>
              <p>
                Prompt version:{' '}
                <span className='font-mono'>
                  {existingReport.aiGenerationMeta.promptVersion}
                </span>
              </p>
              <p>
                Latency:{' '}
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
