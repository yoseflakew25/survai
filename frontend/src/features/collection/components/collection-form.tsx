'use client';

import { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/toast';
import type { PublicSurvey, PublicSection, PublicQuestion, AnswerValue } from '../api/types';
import { CollectionProgress } from './collection-progress';
import { PublicQuestionInput } from './public-question-input';
import { CollectionComplete } from './collection-complete';
import { submitAnswer, completeSurvey } from '../api/service';

interface CollectionFormProps {
  survey: PublicSurvey;
}

export function CollectionForm({ survey }: CollectionFormProps) {
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const sections = survey.sections;
  const currentSection = sections[currentSectionIndex];
  const isFirstSection = currentSectionIndex === 0;
  const isLastSection = currentSectionIndex === sections.length - 1;

  // Compute per-section answer counts
  const answeredCounts = useMemo(
    () =>
      sections.map((section) =>
        section.questions.filter((q) => {
          const v = answers[q.id];
          if (v === null || v === undefined) return false;
          if (Array.isArray(v)) return v.length > 0;
          if (typeof v === 'string') return v.trim().length > 0;
          return true;
        }).length
      ),
    [sections, answers]
  );

  const requiredCounts = useMemo(
    () =>
      sections.map(
        (section) => section.questions.filter((q) => q.isRequired).length
      ),
    [sections]
  );

  // ---- Handlers ----

  const handleAnswerChange = useCallback(
    (questionId: string, value: AnswerValue) => {
      setAnswers((prev) => ({ ...prev, [questionId]: value }));
      // Clear error on change
      setErrors((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    },
    []
  );

  const validateSection = useCallback(
    (section: PublicSection): boolean => {
      const newErrors: Record<string, string> = {};
      let valid = true;

      for (const q of section.questions) {
        if (!q.isRequired) continue;
        const v = answers[q.id];
        const isEmpty =
          v === null ||
          v === undefined ||
          (typeof v === 'string' && v.trim() === '') ||
          (Array.isArray(v) && v.length === 0);

        if (isEmpty) {
          newErrors[q.id] = 'This question is required';
          valid = false;
        }
      }

      setErrors(newErrors);
      return valid;
    },
    [answers]
  );

  const handleNext = useCallback(() => {
    if (!validateSection(currentSection)) {
      toast.error('Please answer all required questions', {
        description: 'Some required questions are still unanswered.'
      });
      return;
    }
    setCurrentSectionIndex((i) => Math.min(sections.length - 1, i + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentSection, validateSection, sections.length]);

  const handlePrev = useCallback(() => {
    setCurrentSectionIndex((i) => Math.max(0, i - 1));
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!validateSection(currentSection)) {
      toast.error('Please answer all required questions', {
        description: 'Some required questions are still unanswered.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Submit all answers
      for (const [questionId, value] of Object.entries(answers)) {
        if (value !== null && value !== undefined) {
          await submitAnswer('resp_mock_001', { questionId, value });
        }
      }
      await completeSurvey('resp_mock_001');
      setIsCompleted(true);
      toast.success('Survey submitted!', {
        description: 'Thank you for your participation.'
      });
    } catch {
      toast.error('Submission failed', {
        description: 'Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [currentSection, validateSection, answers]);

  // ---- Render ----

  if (isCompleted) {
    return <CollectionComplete title={survey.title} />;
  }

  return (
    <div className='mx-auto flex min-h-dvh max-w-2xl flex-col bg-background p-4 sm:p-6'>
      {/* Header */}
      <div className='mb-6 space-y-1'>
        <h1 className='text-xl font-bold tracking-tight sm:text-2xl'>
          {survey.title}
        </h1>
        {survey.description && (
          <p className='text-muted-foreground text-sm'>{survey.description}</p>
        )}
      </div>

      {/* Progress */}
      <CollectionProgress
        sections={sections}
        currentSectionIndex={currentSectionIndex}
        answeredCounts={answeredCounts}
        requiredCounts={requiredCounts}
        className='mb-6'
      />

      {/* Section card */}
      <Card className='flex-1'>
        <CardHeader className='pb-4'>
          <div className='flex items-center gap-2'>
            <span className='bg-primary/10 text-primary flex size-7 items-center justify-center rounded-full text-xs font-bold'>
              {currentSectionIndex + 1}
            </span>
            <div>
              <CardTitle className='text-base'>{currentSection.title}</CardTitle>
              {currentSection.description && (
                <CardDescription className='mt-0.5 text-xs'>
                  {currentSection.description}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className='space-y-6'>
          {currentSection.questions.map((question) => (
            <PublicQuestionInput
              key={question.id}
              question={question}
              value={answers[question.id] ?? null}
              onChange={(value) => handleAnswerChange(question.id, value)}
              error={errors[question.id]}
            />
          ))}
        </CardContent>
      </Card>

      {/* Navigation footer */}
      <div className='sticky bottom-0 mt-4 flex items-center justify-between gap-3 bg-background py-4'>
        <Button
          variant='outline'
          onClick={handlePrev}
          disabled={isFirstSection}
          className='min-w-[100px]'
        >
          <Icons.chevronLeft className='mr-1 h-4 w-4' />
          Back
        </Button>

        <span className='text-muted-foreground text-xs'>
          {currentSectionIndex + 1} / {sections.length}
        </span>

        {isLastSection ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className='min-w-[100px]'
          >
            {isSubmitting ? (
              <>
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
                Submitting…
              </>
            ) : (
              <>
                Submit
                <Icons.check className='ml-1 h-4 w-4' />
              </>
            )}
          </Button>
        ) : (
          <Button onClick={handleNext} className='min-w-[100px]'>
            Next
            <Icons.chevronRight className='ml-1 h-4 w-4' />
          </Button>
        )}
      </div>
    </div>
  );
}
