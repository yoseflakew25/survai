'use client';

import { useSuspenseQuery } from '@tanstack/react-query';
import { notFound } from 'next/navigation';
import { Icons } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { respondentDetailOptions } from '../api/queries';
import type { RespondentAnswer } from '../api/types';
import { cn } from '@/lib/utils';
import * as React from 'react';
import Link from 'next/link';

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
    <div className='flex flex-1 flex-col gap-4'>
     

      {/* Respondent header */}
      <div className='flex flex-wrap items-end justify-between gap-6'>
        <div className='min-w-0'>
          <h1 className='text-2xl font-bold tracking-tight text-primary'>
            {detail.name}
          </h1>
          <p className='truncate text-sm text-muted-foreground'>
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



<div className='grid grid-cols-7 gap-4'>

      {/* Form-style answer list */}
      <div className='flex flex-1 flex-col gap-6 col-span-5 '>
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
                <AnsweredQuestionCard
                  key={answer.questionId}
                  answer={answer}
                  questionNumber={answerIdx + 1}
                />
              ))}
            </SectionCard>
          ))
        )}
      </div>

      {/* Sidebar */}
      <div className='shrink-0 space-y-4 lg:block col-span-2'>
        {/* Submission card */}
        <div className='overflow-hidden rounded-lg border bg-background'>
          <div className='border-b bg-muted/30 px-4 py-3'>
            <h3 className='font-semibold text-md text-primary'>Submission</h3>
          </div>
          <dl className='flex flex-col gap-3 px-4 py-3 text-sm'>
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
        <div className='overflow-hidden rounded-lg border bg-background p-4 flex flex-col gap-3'>
          
          <div>
            <p className='font-semibold truncate'>
              {detail.surveyTitle}
            </p>
           
          </div>
          <div>
            <Link href={`/dashboard/surveys/${surveyId}/respondents`} className='w-full'>
            <Button
              variant='outline'
              
              className='w-full justify-start gap-2 font-semibold text-primary hover:bg-primary/10 '
            >
              <Icons.chevronLeft className='h-3.5 w-3.5' />
              Back to all respondents
            </Button>
                        </Link>

          </div>
        </div>
      </div>

      </div>

    </div>
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

function AnsweredQuestionCard({
  answer,
  questionNumber
}: {
  answer: RespondentAnswer;
  questionNumber: number;
}) {
  const question = answerToQuestion(answer, questionNumber);

  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-4 py-4',
        !answer.answered && 'bg-muted/20'
      )}
    >
      <div className='flex items-start gap-3'>
        <span className='text-muted-foreground w-5 shrink-0 pt-0.5 text-right text-sm font-semibold tabular-nums'>
          {questionNumber}.
        </span>
        <div className='min-w-0 flex-1'>
          <p className='text-sm leading-snug font-medium text-foreground'>
            {answer.promptText}
            {answer.helpText ? (
              <span className='text-muted-foreground ml-1.5 text-xs font-normal'>
                ({answer.helpText})
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className='pl-8'>
        {renderAnswerValue(answer)}
        {!answer.answered && (
          <p className='text-muted-foreground text-xs italic'>No answer</p>
        )}
      </div>
    </div>
  );
}

function answerToQuestion(answer: RespondentAnswer, index: number) {
  const options =
    answer.questionType === 'single_choice' ||
    answer.questionType === 'multiple_choice' ||
    answer.questionType === 'dropdown'
      ? [
          { id: String(index), label: `Option ${index + 1}`, value: String(index) }
        ]
      : undefined;

  return React.useMemo(
    () => ({
      id: answer.questionId,
      title: answer.sectionTitle,
      promptText: answer.promptText,
      helpText: answer.helpText ?? '',
      description: '',
      type: answer.questionType,
      isRequired: true,
      options,
      validationRules: (
        answer.questionType === 'rating_scale'
          ? { min: 1, max: answer.scaleMax ?? 5 }
          : undefined
      ),
      conditionalLogic: null
    }),
    [answer, index]
  );
}

function renderAnswerValue(answer: RespondentAnswer): React.ReactNode {
  if (!answer.answered || answer.value === null) {
    return (
      <span className='text-muted-foreground/70 text-sm italic'>No answer</span>
    );
  }

  if (Array.isArray(answer.value)) {
    return (
      <div className='flex flex-wrap gap-2'>
        {answer.value.map((label) => (
          <span
            key={label}
            className='bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-md border border-primary/20 px-2.5 py-1.5 text-sm font-medium'
          >
            <Icons.check className='h-3.5 w-3.5 shrink-0' />
            {label}
          </span>
        ))}
      </div>
    );
  }

  if (typeof answer.value === 'number') {
    if (answer.questionType === 'rating_scale' && answer.scaleMax) {
      return (
        <div className='flex items-center gap-2'>
          <div className='flex gap-1'>
            {Array.from({ length: answer.scaleMax }, (_, i) => {
              const active = answer.value !== null && typeof answer.value === 'number' && i < answer.value;
              return (
                <span
                  key={i}
                  className={cn(
                    'h-3 w-2 rounded-[2px]',
                    active ? 'bg-primary' : 'bg-muted-foreground/20'
                  )}
                />
              );
            })}
          </div>
          <span className='text-muted-foreground text-xs tabular-nums'>
            {answer.value} / {answer.scaleMax}
          </span>
        </div>
      );
    }

    return (
      <span className='bg-muted/60 border border-muted rounded-md px-2.5 py-1.5 text-sm tabular-nums'>
        {answer.value}
      </span>
    );
  }

  return (
    <span className='bg-muted/60 border border-muted rounded-md px-2.5 py-1.5 text-sm break-words'>
      {String(answer.value)}
    </span>
  );
}

