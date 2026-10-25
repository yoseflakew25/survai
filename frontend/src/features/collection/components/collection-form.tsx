'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type {
  PublicSurvey,
  PublicSection,
  AnswerValue
} from '../api/types';
import { CollectionProgress } from './collection-progress';
import { PublicQuestionInput } from './public-question-input';
import { CollectionComplete } from './collection-complete';
import { submitSurvey } from '../api/service';
import {
  displaySurveyDescription,
  displaySurveyTitle
} from '@/lib/survey-display';

interface CollectionFormProps {
  survey: PublicSurvey;
}

function isAnswered(value: AnswerValue): boolean {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

function estimateMinutes(questionCount: number): number {
  return Math.max(2, Math.round(questionCount * 0.4));
}

/** Conditional rule evaluation — matches `ConditionalRule.op` semantics. */
function ruleMatches(rule: { questionId: string; op: string; value: string | number }, answers: Record<string, AnswerValue>): boolean {
  const current = answers[rule.questionId];
  if (current === null || current === undefined) return false;

  // single_choice / dropdown / number / rating_scale → numeric or string equality
  const check = (a: unknown, b: unknown): boolean => {
    if (typeof a === 'number' && typeof b === 'number') return a === b;
    return String(a) === String(b);
  };

  switch (rule.op) {
    case 'eq':
      return (
        (Array.isArray(current) ? current.includes(rule.value as string) : check(current, rule.value))
      );
    case 'neq':
      return !(
        (Array.isArray(current) ? current.includes(rule.value as string) : check(current, rule.value))
      );
    case 'gt':
      return typeof current === 'number' && typeof rule.value === 'number' && current > rule.value;
    case 'lt':
      return typeof current === 'number' && typeof rule.value === 'number' && current < rule.value;
    case 'contains':
      return typeof current === 'string' && String(current).includes(String(rule.value));
    case 'between':
      if (typeof current !== 'number' || typeof rule.value !== 'number') return false;
      const lo = rule.value ?? 0;
      const hi = rule.value ?? lo;
      return current >= lo && current <= hi;
    default:
      return false;
  }
}

function conditionIsActive(logic: { operator: string; rules: { questionId: string; op: string; value: string | number }[] }, answers: Record<string, AnswerValue>): boolean {
  if (!logic || logic.rules.length === 0) return true;
  const results = logic.rules.map((r) => ruleMatches(r, answers));
  return logic.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

export function CollectionForm({ survey }: CollectionFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const sections = survey.sections;
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  // ----- Derived -----
  const { answeredCounts, requiredCounts, totalRequired, totalAnsweredRequired } =
    useMemo(() => {
      const answered = sections.map(
        (section) =>
          section.questions.filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers) ? isAnswered(answers[q.id]) : true).length
      );
      const required = sections.map(
        (section) =>
          section.questions.filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers) ? q.isRequired : false).length
      );
      const answeredRequired = sections.reduce(
        (sum, section) =>
          sum +
          section.questions.filter((q) =>
            (!q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers)) &&
            q.isRequired &&
            isAnswered(answers[q.id])
          ).length,
        0
      );
      return {
        answeredCounts: answered,
        requiredCounts: required,
        totalRequired: required.reduce((a, b) => a + b, 0),
        totalAnsweredRequired: answeredRequired
      };
    }, [sections, answers]);

  const totalQuestions = sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers)).length,
    0
  );

  // ----- Handlers -----

  const scrollSectionIntoView = useCallback(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  // Scroll to the first invalid question whenever validation marks errors.
  useEffect(() => {
    const firstErrorId = Object.keys(errors)[0];
    if (!firstErrorId) return;
    const el = document.getElementById(firstErrorId);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [errors]);

  const handleAnswerChange = useCallback((questionId: string, value: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setErrors((prev) => {
      if (!(questionId in prev)) return prev;
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
  }, []);

  /** Validates one section; sets its error map and returns it for messaging. */
  const validateSection = useCallback(
    (section: PublicSection): Record<string, string> => {
      const newErrors: Record<string, string> = {};
      for (const q of section.questions) {
        if (q.conditionalLogic && !conditionIsActive(q.conditionalLogic, answers)) continue;
        if (!q.isRequired || isAnswered(answers[q.id])) continue;
        newErrors[q.id] = 'Please answer this question';
      }
      setErrors(newErrors);
      return newErrors;
    },
    [answers]
  );

  const handleNext = useCallback(() => {
    const sectionErrors = validateSection(currentSection);
    if (Object.keys(sectionErrors).length > 0) {
      toast.error('Almost there — a few questions need answers', {
        description: 'Review the highlighted questions in this section.'
      });
      return;
    }
    setErrors({});
    setCurrentSectionIndex((i) => Math.min(sections.length - 1, i + 1));
    scrollSectionIntoView();
  }, [currentSection, validateSection, sections.length, scrollSectionIntoView]);

  const handlePrev = useCallback(() => {
    setErrors({});
    setCurrentSectionIndex((i) => Math.max(0, i - 1));
    scrollSectionIntoView();
  }, [scrollSectionIntoView]);

  const handleJumpToSection = useCallback(
    (index: number) => {
      setErrors({});
      setCurrentSectionIndex(index);
      scrollSectionIntoView();
    },
    [scrollSectionIntoView]
  );

  const handleSubmit = useCallback(async () => {
    // Validate every required question across the whole survey.
    const buildErrorsFor = (section: PublicSection) => {
      const map: Record<string, string> = {};
      for (const q of section.questions) {
        if (q.conditionalLogic && !conditionIsActive(q.conditionalLogic, answers)) continue;
        if (q.isRequired && !isAnswered(answers[q.id])) {
          map[q.id] = 'Please answer this question';
        }
      }
      return map;
    };

    let firstInvalidIndex = -1;
    let firstInvalidOrder = Number.POSITIVE_INFINITY;
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const invalid = section.questions.findIndex(
        (q) =>
          (!q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers)) &&
          q.isRequired &&
          !isAnswered(answers[q.id])
      );
      if (invalid >= 0 && section.orderIndex < firstInvalidOrder) {
        firstInvalidOrder = section.orderIndex;
        firstInvalidIndex = i;
      }
    }

    if (firstInvalidIndex >= 0) {
      const invalidSection = sections[firstInvalidIndex];
      if (firstInvalidIndex !== currentSectionIndex) {
        setCurrentSectionIndex(firstInvalidIndex);
        setErrors({});
        // Wait for the section card to mount, then flag its missing questions.
        window.setTimeout(
          () => setErrors(buildErrorsFor(invalidSection)),
          100
        );
      } else {
        setErrors(buildErrorsFor(invalidSection));
      }
      toast.error('Please complete the highlighted questions', {
        description: `Jumped to “${invalidSection.title}” so you can finish it.`
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = Object.entries(answers)
        .filter(([, value]) => isAnswered(value))
        .map(([questionId, value]) => ({ questionId, value }));
      await submitSurvey(survey.surveyVersionId, payload);
      setIsCompleted(true);
      window.scrollTo({ top: 0 });
    } catch (err) {
      toast.error('Submission failed', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Something went wrong. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [sections, currentSectionIndex, answers, survey.surveyVersionId]);

  const handleReset = useCallback(() => {
    setAnswers({});
    setErrors({});
    setIsCompleted(false);
    setCurrentSectionIndex(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (isCompleted) {
    return (
      <CollectionComplete
        title={survey.title}
        description={survey.description}
        answeredCount={sections.reduce(
          (sum, section) =>
            sum + section.questions.filter((q) =>
              !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers) ? isAnswered(answers[q.id]) : true
            ).length,
          0
        )}
        totalQuestions={totalQuestions}
        submittedAt={new Date().toISOString()}
        collectsIdentity
        onReset={handleReset}
      />
    );
  }

  const answeredInSection = answeredCounts[currentSectionIndex] ?? 0;
  const totalInSection = currentSection.questions.filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers)).length;
  const sectionProgress =
    totalRequired > 0
      ? Math.round(Math.min(1, totalAnsweredRequired / totalRequired) * 100)
      : Math.round((totalAnsweredRequired / Math.max(1, totalQuestions)) * 100);

  // Prepend the section number offset for continuous question numbering.
  let questionOffset = 0;
  for (let i = 0; i < currentSectionIndex; i++) {
    questionOffset += sections[i].questions.filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers)).length;
  }

  return (
    <div className='flex min-h-dvh flex-col bg-white'>
      <main className='mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8'>
        {/* Hero — Survai brand outline (matches SurvaiBrandCard) */}
        <header className='relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)]'>
          <div
            className='pointer-events-none absolute inset-0 opacity-40'
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
              maskImage:
                'linear-gradient(to right, transparent, black 25%, black 75%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 25%, black 75%, transparent)'
            }}
          />
          <div className='relative space-y-5 px-5 py-6 sm:px-7 sm:py-7'>
            <div className='space-y-2'>
              <h1 className='font-display text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.75rem] sm:leading-snug'>
                {displaySurveyTitle(survey.title)}
              </h1>
              {displaySurveyDescription(survey.title, survey.description) ? (
                <p className='max-w-2xl text-sm leading-relaxed text-foreground/75'>
                  {displaySurveyDescription(survey.title, survey.description)}
                </p>
              ) : null}
            </div>

            <div className='flex flex-wrap items-center gap-2'>
              {[
                { icon: Icons.forms, label: `${sections.length} sections` },
                { icon: Icons.check, label: `${totalQuestions} questions` },
                {
                  icon: Icons.clock,
                  label: `~${estimateMinutes(totalQuestions)} min`
                }
              ].map((chip) => (
                <span
                  key={chip.label}
                  className='inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_8%,transparent)] px-2.5 py-1 text-[11px] font-medium text-foreground'
                >
                  <chip.icon className='size-3 opacity-80' />
                  {chip.label}
                </span>
              ))}
              {totalRequired > 0 ? (
                <span className='ml-auto text-[11px] text-foreground/70'>
                  <span className='font-semibold text-foreground'>*</span>{' '}
                  required
                </span>
              ) : null}
            </div>
          </div>
        </header>

        {/* Progress rail */}
        <div ref={scrollAnchorRef} className='scroll-mt-6'>
          <CollectionProgress
            sections={sections}
            currentSectionIndex={currentSectionIndex}
            answeredCounts={answeredCounts}
            requiredCounts={requiredCounts}
            onSelectSection={handleJumpToSection}
            className='mt-4'
          />
        </div>

        {/* Section card */}
        <div className='mt-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm'>
          {/* Section header */}
          <div className='border-b border-border bg-white px-5 py-4 sm:px-6'>
            <div className='flex items-start gap-3'>
              <span className='bg-primary text-primary-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold'>
                {currentSectionIndex + 1}
              </span>
              <div className='min-w-0 flex-1'>
                <h2 className='text-base font-semibold tracking-tight'>
                  {currentSection.title}
                </h2>
                {currentSection.description && (
                  <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                    {currentSection.description}
                  </p>
                )}
              </div>
              <Badge variant='secondary' className='shrink-0 text-[10px]'>
                {answeredInSection} of {totalInSection} answered
              </Badge>
            </div>
          </div>

          {/* Questions */}
          <div className='px-5 py-6 sm:px-6'>
            <div className='space-y-8'>
              {currentSection.questions
                .filter((q) => !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers))
                .map((question, qIndex) => (
                  <PublicQuestionInput
                    key={question.id}
                    question={question}
                    questionNumber={questionOffset + qIndex + 1}
                    value={answers[question.id] ?? null}
                    onChange={(value) => handleAnswerChange(question.id, value)}
                    error={errors[question.id]}
                  />
                ))}
            </div>
          </div>

          {/* Footer nav */}
          <div className='flex items-center justify-between gap-3 border-t border-border bg-white px-4 py-3.5 sm:px-6'>
            <Button
              variant='outline'
              onClick={handlePrev}
              disabled={currentSectionIndex === 0}
              className='min-w-[7rem] bg-white shadow-none'
            >
              <Icons.chevronLeft className='mr-1 size-4' />
              Back
            </Button>

            <p className='text-muted-foreground hidden text-xs sm:block'>
              {sectionProgress}% complete
            </p>

            {isLastSection ? (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className='min-w-[9rem] shadow-sm'
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className='mr-2 size-4 animate-spin' />
                    Submitting…
                  </>
                ) : (
                  <>
                    Submit survey
                    <Icons.send className='ml-2 size-3.5' />
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className='min-w-[7rem] shadow-sm'
              >
                Next
                <Icons.chevronRight className='ml-1 size-4' />
              </Button>
            )}
          </div>
        </div>

        <p className='text-muted-foreground mt-6 flex items-center justify-center gap-1.5 pb-2 text-center text-[11px]'>
          <Icons.lock className='size-3' />
          Your responses are used only for this research and visible to the
          organizer.
        </p>
      </main>
    </div>
  );
}
