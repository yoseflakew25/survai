'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { respondentDetailOptions } from '../api/queries';
import type { RespondentAnswer } from '../api/types';
import { cn } from '@/lib/utils';

interface RespondentDetailViewProps {
  surveyId: string;
  respondentId: string;
}

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return (
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' +
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

function RatingSegments({
  value,
  max
}: {
  value: number;
  max: number;
}) {
  return (
    <div className='flex items-center gap-1'>
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-3 w-2 rounded-[2px]',
            i < value ? 'bg-primary' : 'bg-muted'
          )}
        />
      ))}
    </div>
  );
}

function AnswerValue({ answer }: { answer: RespondentAnswer }) {
  if (!answer.answered || answer.value === null) {
    return (
      <span className='text-muted-foreground/70 text-sm italic'>No answer</span>
    );
  }

  // Multiple selection → chips (right aligned)
  if (Array.isArray(answer.value)) {
    return (
      <div className='flex flex-wrap justify-end gap-1.5'>
        {answer.value.map((label) => (
          <span
            key={label}
            className='bg-muted/60 text-foreground inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium'
          >
            <Icons.check className='h-3 w-3 text-primary' />
            {label}
          </span>
        ))}
      </div>
    );
  }

  // Rating scale → segment bar + n/5 caption
  if (
    typeof answer.value === 'number' &&
    answer.questionType === 'rating_scale' &&
    answer.scaleMax
  ) {
    const max = answer.scaleMax;
    const ratingValue = answer.value;
    return (
      <div className='flex items-center gap-2 justify-end'>
        <RatingSegments value={ratingValue} max={max} />
        <span className='text-muted-foreground text-xs tabular-nums'>
          {ratingValue} / {max}
        </span>
      </div>
    );
  }

  // Single choice / dropdown → highlighted chip
  if (
    (answer.questionType === 'single_choice' ||
      answer.questionType === 'dropdown') &&
    typeof answer.value === 'string'
  ) {
    return (
      <span className='bg-primary/10 text-primary inline-flex items-center gap-1 rounded-md border border-primary/20 px-2 py-0.5 text-xs font-medium'>
        <Icons.check className='h-3 w-3' />
        {answer.value}
      </span>
    );
  }

  // Free text / number / date → right-aligned pill
  return (
    <span className='bg-muted/60 border border-muted rounded-md px-2.5 py-1.5 text-right text-sm break-words'>
      {String(answer.value)}
    </span>
  );
}

function SectionCard(
  props: {
    index: number;
    title: string;
    answered: number;
    total: number;
    children: React.ReactNode;
  }
) {
  return (
    <div className='overflow-hidden rounded-lg border bg-background'>
      <div className='flex items-center gap-2.5 border-b bg-muted/30 px-4 py-3'>
        <span className='flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold'>
          {props.index}
        </span>
        <div className='min-w-0'>
          <h3 className='truncate font-semibold'>{props.title}</h3>
        </div>
        <span className='ml-auto shrink-0 text-xs text-muted-foreground'>
          {props.answered} of {props.total} answered
        </span>
      </div>
      <div className='divide-y'>{props.children}</div>
    </div>
  );
}

export function RespondentDetailView({
  surveyId,
  respondentId
}: RespondentDetailViewProps) {
  const { data: detail } = useSuspenseQuery(
    respondentDetailOptions(surveyId, respondentId)
  );

  if (!detail) {
    notFound();
  }

  // Group the flat answer list back into survey sections (order preserved).
  const groups: { title: string; answers: RespondentAnswer[] }[] = [];
  for (const answer of detail.answers) {
    const last = groups[groups.length - 1];
    if (last && last.title === answer.sectionTitle) {
      last.answers.push(answer);
    } else {
      groups.push({ title: answer.sectionTitle, answers: [answer] });
    }
  }

  const answeredCount = detail.answers.filter((a) => a.answered).length;
  const totalQuestions = detail.answers.length;
  const completionPct =
    totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;

  return (
    <div className='flex flex-1 flex-col'>
      {/* Breadcrumb */}
      <div className='flex items-center gap-2 px-6 pt-5'>
        <a
          href={`/dashboard/surveys/${surveyId}/respondents`}
          className='flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground'
        >
          <Icons.chevronLeft className='h-4 w-4' />
          All respondents
        </a>
      </div>

      {/* Respondent header */}
      <div className='flex flex-wrap items-start justify-between gap-6 px-6 py-5'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold tracking-tight text-foreground'>
            {detail.name}
          </h1>
          <p className='mt-0.5 truncate text-sm text-muted-foreground'>
            {detail.email}
          </p>
        </div>
        <div className='flex flex-wrap items-center gap-2'>
          <Badge
            variant={detail.status === 'completed' ? 'default' : 'secondary'}
          >
            {detail.status === 'completed' ? (
              <Icons.circleCheck className='mr-1 h-3 w-3' />
            ) : (
              <Icons.clock className='mr-1 h-3 w-3' />
            )}
            {detail.status === 'completed' ? 'Completed' : 'Partial'}
          </Badge>
          <Separator orientation='vertical' className='h-4' />
          <Badge variant='outline' className='font-normal'>
            <Icons.calendar className='mr-1 h-3 w-3' />
            {formatDateTime(detail.submittedAt)}
          </Badge>
          <Badge variant='outline' className='font-normal tabular-nums'>
            <Icons.clock className='mr-1 h-3 w-3' />
            {formatDuration(detail.durationSeconds)}
          </Badge>
          <Badge
            variant={answeredCount === totalQuestions ? 'outline' : 'secondary'}
            className='font-normal tabular-nums'
          >
            <Icons.check className='mr-1 h-3 w-3' />
            {answeredCount} / {totalQuestions} answered
          </Badge>
        </div>
      </div>

      <Separator className='mx-6' />

      {/* Two-column body */}
      <div className='flex flex-1 gap-6 px-6 pb-10'>
        {/* Answers column */}
        <div className='flex flex-1 flex-col gap-4 min-w-0'>
          {groups.length === 0 ? (
            <div className='rounded-lg border border-dashed bg-background px-6 py-16 text-center'>
              <Icons.forms className='text-muted-foreground/40 mx-auto mb-3 h-10 w-10' />
              <h3 className='font-semibold'>No answers recorded</h3>
              <p className='text-muted-foreground mt-1 text-sm'>
                This submission did not include any question responses.
              </p>
            </div>
          ) : (
            groups.map((group, groupIdx) => (
              <SectionCard
                key={group.title}
                index={groupIdx + 1}
                title={group.title}
                answered={group.answers.filter((a) => a.answered).length}
                total={group.answers.length}
              >
                {group.answers.map((answer, answerIdx) => (
                  <div
                    key={answer.questionId}
                    className={cn(
                      'flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8',
                      !answer.answered && 'bg-muted/20'
                    )}
                  >
                    <div className='min-w-0 flex-1'>
                      <p className='flex items-start gap-2 text-sm font-medium'>
                        <span className='shrink-0 text-muted-foreground text-xs font-normal tabular-nums'>
                          {answerIdx + 1}.
                        </span>
                        <span className='min-w-0'>{answer.promptText}</span>
                      </p>
                      {answer.helpText && (
                        <p className='text-muted-foreground mt-0.5 text-xs'>
                          {answer.helpText}
                        </p>
                      )}
                    </div>
                    <div className='flex shrink-0 items-center sm:w-48 sm:justify-end'>
                      <AnswerValue answer={answer} />
                    </div>
                  </div>
                ))}
              </SectionCard>
            ))
          )}
        </div>

        {/* Sidebar */}
        <div className='shrink-0 space-y-4' style={{ width: '260px' }}>
          {/* Submission card */}
          <div className='overflow-hidden rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <h3 className='font-semibold text-sm'>Submission</h3>
            </div>
            <dl className='grid grid-cols-[1fr_auto] gap-x-3 gap-y-2.5 px-4 py-3 text-sm'>
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>Status</dt>
                <Badge
                  variant={detail.status === 'completed' ? 'default' : 'secondary'}
                  className='whitespace-nowrap'
                >
                  {detail.status === 'completed' ? 'Completed' : 'Partial'}
                </Badge>
              </div>
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>Submitted</dt>
                <dd className='text-right text-foreground'>
                  {formatDateTime(detail.submittedAt)}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>Duration</dt>
                <dd className='text-right text-foreground tabular-nums'>
                  {formatDuration(detail.durationSeconds)}
                </dd>
              </div>
              <div className='flex items-center justify-between'>
                <dt className='text-muted-foreground'>Questions</dt>
                <dd className='text-right text-foreground tabular-nums'>
                  {answeredCount} / {totalQuestions}
                </dd>
              </div>
            </dl>
            {/* completion bar */}
            <div className='border-t bg-muted/30 px-4 py-3'>
              <div className='mb-1.5 flex items-center justify-between text-xs'>
                <span className='text-muted-foreground'>
                  {completionPct}% of questions answered
                </span>
                <span className='text-muted-foreground tabular-nums'>
                  {completionPct}%
                </span>
              </div>
              <div className='h-1.5 overflow-hidden rounded-full bg-muted'>
                <div
                  className='h-full rounded-full bg-primary'
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Survey card */}
          <div className='overflow-hidden rounded-lg border bg-background'>
            <div className='border-b bg-muted/30 px-4 py-3'>
              <h3 className='font-semibold text-sm'>Survey</h3>
            </div>
            <div className='px-4 py-3'>
              <p className='font-medium text-foreground truncate'>
                {detail.surveyTitle}
              </p>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                <Badge variant='secondary' className='text-[10px]'>
                  {detail.surveyStatus}
                </Badge>
                <span className='text-muted-foreground text-xs'>
                  Anonymous collection
                </span>
              </div>
            </div>
            <div className='p-3'>
              <Button
                variant='outline'
                size='sm'
                className='w-full justify-start gap-2 font-normal'
              >
                <Icons.externalLink className='h-3.5 w-3.5' />
                Open survey workspace
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
