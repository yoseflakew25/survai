'use client';

import { useState, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { ReviewerFinding, FindingStatus } from '../api/types';
import { getIssueTypeMeta } from '../api/types';
import { updateFindingStatus } from '../api/service';

interface FindingsListProps {
  findings: ReviewerFinding[];
  onFindingUpdate: (finding: ReviewerFinding) => void;
}

export function FindingsList({ findings, onFindingUpdate }: FindingsListProps) {
  const [filter, setFilter] = useState<FindingStatus | 'all'>('all');

  const filtered = findings.filter(
    (f) => filter === 'all' || f.status === filter
  );

  const counts = {
    all: findings.length,
    open: findings.filter((f) => f.status === 'open').length,
    accepted: findings.filter((f) => f.status === 'accepted').length,
    dismissed: findings.filter((f) => f.status === 'dismissed').length
  };

  return (
    <Card>
      <CardHeader>
        <div className='flex items-start justify-between gap-2'>
          <div>
            <CardTitle className='text-base'>Findings</CardTitle>
            <p className='text-muted-foreground mt-0.5 text-xs'>
              {counts.open} open · {counts.accepted} accepted · {counts.dismissed} dismissed
            </p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className='flex gap-1 pt-2'>
          {(['all', 'open', 'accepted', 'dismissed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={cn(
                'rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors',
                filter === status
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              {status}
              {status !== 'all' && (
                <span className='ml-1 opacity-60'>
                  ({counts[status]})
                </span>
              )}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className='space-y-3'>
        {filtered.length === 0 ? (
          <div className='flex flex-col items-center py-8 text-center'>
            <Icons.circleCheck className='text-muted-foreground/30 mb-2 h-8 w-8' />
            <p className='text-muted-foreground text-sm'>
              {filter === 'all'
                ? 'No findings detected'
                : `No ${filter} findings`}
            </p>
          </div>
        ) : (
          filtered.map((finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onUpdate={onFindingUpdate}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

function FindingCard({
  finding,
  onUpdate
}: {
  finding: ReviewerFinding;
  onUpdate: (finding: ReviewerFinding) => void;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const issueMeta = getIssueTypeMeta(finding.issueType);

  const handleStatusChange = useCallback(
    async (status: FindingStatus) => {
      setIsUpdating(true);
      try {
        const updated = await updateFindingStatus(finding.id, status);
        if (updated) {
          onUpdate(updated);
          toast.success(
            status === 'accepted'
              ? 'Finding accepted'
              : status === 'dismissed'
                ? 'Finding dismissed'
                : 'Finding reopened'
          );
        }
      } catch {
        toast.error('Failed to update finding');
      } finally {
        setIsUpdating(false);
      }
    },
    [finding.id, onUpdate]
  );

  return (
    <div
      className={cn(
        'rounded-lg border p-3 space-y-2 transition-colors',
        finding.status === 'accepted' && 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20',
        finding.status === 'dismissed' && 'opacity-60'
      )}
    >
      {/* Header */}
      <div className='flex items-start justify-between gap-2'>
        <div className='flex items-center gap-2'>
          <span className={cn('text-xs font-medium', issueMeta.color)}>
            {issueMeta.label}
          </span>
          {finding.sectionTitle && (
            <Badge variant='outline' className='text-[10px]'>
              {finding.sectionTitle}
            </Badge>
          )}
        </div>
        {finding.status !== 'open' && (
          <Badge
            variant={finding.status === 'accepted' ? 'default' : 'secondary'}
            className='text-[10px]'
          >
            {finding.status}
          </Badge>
        )}
      </div>

      {/* Question reference */}
      {finding.questionText && (
        <p className='text-muted-foreground text-xs italic'>
          &ldquo;{finding.questionText}&rdquo;
        </p>
      )}

      {/* Explanation */}
      <p className='text-sm'>{finding.explanation}</p>

      {/* Suggested rewrite */}
      {finding.suggestedRewrite && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='flex items-center gap-1 text-xs text-primary hover:underline'
        >
          {isExpanded ? (
            <Icons.chevronUp className='h-3 w-3' />
          ) : (
            <Icons.chevronDown className='h-3 w-3' />
          )}
          Suggested improvement
        </button>
      )}

      {isExpanded && finding.suggestedRewrite && (
        <div className='rounded-md bg-primary/5 p-2 text-xs'>
          <p className='text-muted-foreground mb-1 font-medium'>Suggested rewrite:</p>
          <p>{finding.suggestedRewrite}</p>
        </div>
      )}

      {/* Actions */}
      {finding.status === 'open' && (
        <>
          <Separator />
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              
              onClick={() => handleStatusChange('accepted')}
              disabled={isUpdating}
              className='h-7 text-xs'
            >
              <Icons.check className='mr-1 h-3 w-3' />
              Accept
            </Button>
            <Button
              variant='ghost'
              
              onClick={() => handleStatusChange('dismissed')}
              disabled={isUpdating}
              className='h-7 text-xs'
            >
              <Icons.close className='mr-1 h-3 w-3' />
              Dismiss
            </Button>
          </div>
        </>
      )}

      {finding.status !== 'open' && (
        <Button
          variant='ghost'
          
          onClick={() => handleStatusChange('open')}
          disabled={isUpdating}
          className='h-7 text-xs'
        >
          Reopen
        </Button>
      )}
    </div>
  );
}
