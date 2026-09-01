'use client';

import { useCallback, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { latestReviewOptions } from '../api/queries';
import { notFound } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { ReviewTrigger } from './review-trigger';
import { FindingsList } from './findings-list';
import { QualityScore } from './quality-score';
import type { ReviewerReport, ReviewerFinding } from '../api/types';

interface ReviewerViewProps {
  surveyId: string;
}

export function ReviewerView({ surveyId }: ReviewerViewProps) {
  return <ReviewerContent surveyId={surveyId} />;
}

function ReviewerContent({ surveyId }: { surveyId: string }) {
  const { data: report } = useSuspenseQuery(latestReviewOptions(surveyId));
  const [localReport, setLocalReport] = useState(report);

  if (!surveyId) {
    notFound();
  }

  const handleReviewComplete = useCallback((newReport: ReviewerReport) => {
    setLocalReport(newReport);
  }, []);

  const handleFindingUpdate = useCallback(
    (finding: ReviewerFinding) => {
      if (!localReport) return;
      setLocalReport({
        ...localReport,
        findings: localReport.findings.map((f) =>
          f.id === finding.id ? finding : f
        )
      });
    },
    [localReport]
  );

  return (
    <div className='grid gap-6 lg:grid-cols-3'>
      {/* Main content — findings */}
      <div className='space-y-6 lg:col-span-2'>
        {localReport ? (
          <FindingsList
            findings={localReport.findings}
            onFindingUpdate={handleFindingUpdate}
          />
        ) : (
          <div className='flex flex-col items-center rounded-xl border border-dashed py-16 text-center'>
            <Icons.eyeOff className='text-muted-foreground/30 mb-3 h-10 w-10' />
            <p className='text-muted-foreground mb-1 text-sm font-medium'>
              No review yet
            </p>
            <p className='text-muted-foreground text-xs'>
              Run an AI review to analyze your survey questions
            </p>
          </div>
        )}
      </div>

      {/* Sidebar */}
      <div className='space-y-6'>
        {/* AI Trigger */}
        <ReviewTrigger
          surveyId={surveyId}
          existingReport={localReport}
          onReviewComplete={handleReviewComplete}
        />

        <Separator />

        {/* Quality Score */}
        {localReport && (
          <QualityScore
            score={localReport.overallQualityScore}
            criteria={localReport.scoreCriteria}
            estimatedMinutes={localReport.estimatedCompletionMinutes}
            requiredQuestionCount={localReport.requiredQuestionCount}
          />
        )}
      </div>
    </div>
  );
}
