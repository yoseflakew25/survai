'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { conditionIsActive } from '@/lib/conditional-logic';
import type { Question, Section } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

interface SurveyPreviewProps {
  title: string;
  sections: Section[];
}

type PreviewAnswer = string | number | string[] | null;

function optionChoices(question: Question): { label: string; value: string }[] {
  if (question.options?.length) {
    return question.options.map((o) => ({ label: o.label, value: o.value }));
  }
  if (question.type === 'rating_scale') {
    const max = question.validationRules?.max ?? 5;
    return Array.from({ length: max }, (_, i) => ({
      label: String(i + 1),
      value: String(i + 1)
    }));
  }
  return [];
}

export function SurveyPreview({ title, sections }: SurveyPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [answers, setAnswers] = useState<Record<string, PreviewAnswer>>({});

  const visibleBySection = useMemo(() => {
    return sections.map((section) => ({
      section,
      questions: section.questions.filter((q) =>
        conditionIsActive(q.conditionalLogic, answers)
      )
    }));
  }, [sections, answers]);

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const visibleCount = visibleBySection.reduce(
    (sum, row) => sum + row.questions.length,
    0
  );
  const hiddenCount = totalQuestions - visibleCount;

  function setAnswer(questionId: string, value: PreviewAnswer) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  return (
    <div className='rounded-lg border bg-background p-4'>
      <div className='mb-3 flex items-center justify-between gap-2'>
        <div className='flex min-w-0 items-center gap-2'>
          <div className='bg-primary/10 flex h-7 w-7 shrink-0 items-center justify-center rounded-md'>
            <Icons.eye className='text-primary h-4 w-4' />
          </div>
          <div className='min-w-0'>
            <h3 className='text-sm font-semibold'>Preview</h3>
            <p className='text-muted-foreground truncate text-[11px]'>
              Answer to test skip logic
            </p>
          </div>
        </div>
        <Button
          variant='ghost'
          size='sm'
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>

      <div className='space-y-3'>
        <div className='rounded-md bg-muted/50 p-3'>
          <p className='text-sm font-medium'>{title || 'Untitled Survey'}</p>
          <p className='text-muted-foreground  text-xs'>
            {sections.length} sections · {visibleCount} visible
            {hiddenCount > 0 ? ` · ${hiddenCount} skipped` : ''}
          </p>
        </div>

        {isExpanded ? (
          <div className='max-h-[420px] space-y-4 overflow-y-auto pr-1'>
            {visibleBySection.map(({ section, questions }, i) => (
              <div key={section.id} className='space-y-2'>
                <div className='flex items-center gap-2'>
                  <span className='bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold'>
                    {i + 1}
                  </span>
                  <p className='text-xs font-medium'>{section.title}</p>
                </div>
                {questions.length === 0 ? (
                  <p className='text-muted-foreground ml-7 text-[11px] italic'>
                    All questions in this section are currently skipped.
                  </p>
                ) : (
                  <div className='ml-7 space-y-3'>
                    {questions.map((question) => {
                      const meta = getQuestionTypeMeta(question.type);
                      const TypeIcon = Icons[meta.icon as keyof typeof Icons];
                      const choices = optionChoices(question);
                      const skippedByLogic = Boolean(
                        question.conditionalLogic?.rules.length
                      );
                      return (
                        <div
                          key={question.id}
                          className='space-y-1.5 rounded-lg border border-border/70 p-2.5'
                        >
                          <div className='flex items-start gap-1.5 text-xs'>
                            {TypeIcon ? (
                              <TypeIcon className='text-muted-foreground mt-0.5 h-3 w-3 shrink-0' />
                            ) : null}
                            <div className='min-w-0 flex-1'>
                              <p className='leading-relaxed'>
                                {question.promptText}
                              </p>
                              <div className=' flex flex-wrap gap-1'>
                                {question.isRequired ? (
                                  <Badge
                                    variant='secondary'
                                    className='text-[9px]'
                                  >
                                    Required
                                  </Badge>
                                ) : null}
                                {skippedByLogic ? (
                                  <Badge
                                    variant='outline'
                                    className='text-[9px]'
                                  >
                                    Has skip rule
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                          </div>

                          {choices.length > 0 ? (
                            <div className='flex flex-wrap gap-1.5'>
                              {choices.map((opt) => {
                                const selected =
                                  String(answers[question.id] ?? '') ===
                                  opt.value;
                                return (
                                  <button
                                    key={opt.value}
                                    type='button'
                                    onClick={() =>
                                      setAnswer(
                                        question.id,
                                        question.type === 'rating_scale'
                                          ? Number(opt.value)
                                          : opt.value
                                      )
                                    }
                                    className={cn(
                                      'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                                      selected
                                        ? 'border-foreground bg-foreground text-background'
                                        : 'border-border bg-card text-muted-foreground hover:text-foreground'
                                    )}
                                  >
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          ) : (
                            <input
                              className='border-input bg-background h-8 w-full rounded-md border px-2 text-xs'
                              placeholder='Type a preview answer…'
                              value={
                                typeof answers[question.id] === 'string' ||
                                typeof answers[question.id] === 'number'
                                  ? String(answers[question.id])
                                  : ''
                              }
                              onChange={(e) =>
                                setAnswer(
                                  question.id,
                                  question.type === 'number'
                                    ? e.target.value === ''
                                      ? null
                                      : Number(e.target.value)
                                    : e.target.value
                                )
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {Object.keys(answers).length > 0 ? (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                className='w-full text-xs'
                onClick={() => setAnswers({})}
              >
                Reset preview answers
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
