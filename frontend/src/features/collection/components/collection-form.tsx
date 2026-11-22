'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from '@/components/icons';
import { SurvaiLogo } from '@/components/survai-logo';
import { toast } from '@/lib/toast';
import type {
  PublicSurvey,
  PublicSection,
  AnswerValue
} from '../api/types';
import { PublicQuestionInput } from './public-question-input';
import { CollectionComplete } from './collection-complete';
import { submitSurvey } from '../api/service';
import {
  displaySurveyDescription,
  displaySurveyTitle
} from '@/lib/survey-display';
import { conditionIsActive } from '@/lib/conditional-logic';
import { useLocale, useTranslations } from 'next-intl';
import { LanguageSwitcher } from '@/components/language-switcher';
import '../styles/collection-v2.css';

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

function questionVisible(
  q: { conditionalLogic?: PublicSurvey['sections'][number]['questions'][number]['conditionalLogic'] },
  answers: Record<string, AnswerValue>
) {
  return !q.conditionalLogic || conditionIsActive(q.conditionalLogic, answers);
}

export function CollectionForm({ survey }: CollectionFormProps) {
  const t = useTranslations('publicCollect');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const sections = survey.sections;
  const currentSection = sections[currentSectionIndex];
  const isLastSection = currentSectionIndex === sections.length - 1;
  const scrollAnchorRef = useRef<HTMLDivElement>(null);

  const { answeredCounts, totalRequired, totalAnsweredRequired } = useMemo(() => {
    const answered = sections.map(
      (section) =>
        section.questions.filter((q) =>
          questionVisible(q, answers) ? isAnswered(answers[q.id]) : true
        ).length
    );
    const required = sections.map(
      (section) =>
        section.questions.filter((q) =>
          questionVisible(q, answers) ? q.isRequired : false
        ).length
    );
    const answeredRequired = sections.reduce(
      (sum, section) =>
        sum +
        section.questions.filter(
          (q) =>
            questionVisible(q, answers) &&
            q.isRequired &&
            isAnswered(answers[q.id])
        ).length,
      0
    );
    return {
      answeredCounts: answered,
      totalRequired: required.reduce((a, b) => a + b, 0),
      totalAnsweredRequired: answeredRequired
    };
  }, [sections, answers]);

  const totalQuestions = sections.reduce(
    (s, sec) => s + sec.questions.filter((q) => questionVisible(q, answers)).length,
    0
  );

  const scrollSectionIntoView = useCallback(() => {
    scrollAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  useEffect(() => {
    const firstErrorId = Object.keys(errors)[0];
    if (!firstErrorId) return;
    document
      .getElementById(`collection-q-${firstErrorId}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
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

  const validateSection = useCallback(
    (section: PublicSection): Record<string, string> => {
      const newErrors: Record<string, string> = {};
      for (const q of section.questions) {
        if (!questionVisible(q, answers)) continue;
        if (!q.isRequired || isAnswered(answers[q.id])) continue;
        newErrors[q.id] = t('answerRequired');
      }
      setErrors(newErrors);
      return newErrors;
    },
    [answers, t]
  );

  const handleNext = useCallback(() => {
    const sectionErrors = validateSection(currentSection);
    if (Object.keys(sectionErrors).length > 0) {
      toast.error(t('almostThere'), {
        description: t('reviewSection')
      });
      return;
    }
    setErrors({});
    setCurrentSectionIndex((i) => Math.min(sections.length - 1, i + 1));
    scrollSectionIntoView();
  }, [currentSection, validateSection, sections.length, scrollSectionIntoView, t]);

  const handlePrev = useCallback(() => {
    setErrors({});
    setCurrentSectionIndex((i) => Math.max(0, i - 1));
    scrollSectionIntoView();
  }, [scrollSectionIntoView]);

  const handleSubmit = useCallback(async () => {
    const buildErrorsFor = (section: PublicSection) => {
      const map: Record<string, string> = {};
      for (const q of section.questions) {
        if (!questionVisible(q, answers)) continue;
        if (q.isRequired && !isAnswered(answers[q.id])) {
          map[q.id] = t('answerRequired');
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
          questionVisible(q, answers) &&
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
        window.setTimeout(() => setErrors(buildErrorsFor(invalidSection)), 100);
      } else {
        setErrors(buildErrorsFor(invalidSection));
      }
      toast.error(t('completeHighlighted'), {
        description: t('jumpedToSection', { title: invalidSection.title })
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
      toast.error(t('submitError'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : tCommon('errorGeneric')
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [sections, currentSectionIndex, answers, survey.surveyVersionId, t, tCommon]);

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
            sum +
            section.questions.filter((q) =>
              questionVisible(q, answers) ? isAnswered(answers[q.id]) : true
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
  const totalInSection = currentSection.questions.filter((q) =>
    questionVisible(q, answers)
  ).length;
  const sectionProgress =
    totalRequired > 0
      ? Math.round(Math.min(1, totalAnsweredRequired / totalRequired) * 100)
      : Math.round((totalAnsweredRequired / Math.max(1, totalQuestions)) * 100);

  let questionOffset = 0;
  for (let i = 0; i < currentSectionIndex; i++) {
    questionOffset += sections[i].questions.filter((q) =>
      questionVisible(q, answers)
    ).length;
  }

  const description = displaySurveyDescription(survey.title, survey.description);

  return (
    <div className='collect-v2-root' lang={locale}>
      <header className='collect-hdr'>
        <SurvaiLogo />
        <div className='collect-hdr-lang'>
          <LanguageSwitcher />
        </div>
      </header>

      <main className='collect-main'>
        <header className='collect-hero'>
          <h1 className='collect-hero-title'>{displaySurveyTitle(survey.title)}</h1>
          {description ? <p className='collect-hero-desc'>{description}</p> : null}

          <div className='collect-hero-meta'>
            <span className='collect-chip'>
              <Icons.forms />
              {t('sectionsCount', { count: sections.length })}
            </span>
            <span className='collect-chip'>
              <Icons.check />
              {t('questionsCount', { count: totalQuestions })}
            </span>
            <span className='collect-chip'>
              <Icons.clock />
              {t('minutesEstimate', { count: estimateMinutes(totalQuestions) })}
            </span>
            {totalRequired > 0 ? (
              <span className='collect-required-hint'>
                <b>*</b> {t('required')}
              </span>
            ) : null}
          </div>
        </header>

        <div ref={scrollAnchorRef} className='collect-frame'>
          <div className='collect-section-head'>
            <span className='collect-section-index' aria-hidden='true'>
              {currentSectionIndex + 1}
            </span>
            <div className='collect-section-copy'>
              <h2 className='collect-section-title'>{currentSection.title}</h2>
              {currentSection.description ? (
                <p className='collect-section-desc'>{currentSection.description}</p>
              ) : null}
            </div>
            <span className='collect-section-stat'>
              {t('answeredOf', {
                answered: answeredInSection,
                total: totalInSection
              })}
            </span>
          </div>

          <div className='collect-questions'>
            {currentSection.questions
              .filter((q) => questionVisible(q, answers))
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

          <div className='collect-nav'>
            <button
              type='button'
              className='collect-btn'
              onClick={handlePrev}
              disabled={currentSectionIndex === 0}
            >
              <Icons.chevronLeft />
              {t('previous')}
            </button>

            <p className='collect-progress'>
              {t('progress')}: {sectionProgress}%
            </p>

            {isLastSection ? (
              <button
                type='button'
                className='collect-btn collect-btn-ink'
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Icons.spinner className='spin' />
                    {t('submitting')}
                  </>
                ) : (
                  <>
                    {t('submit')}
                    <Icons.send />
                  </>
                )}
              </button>
            ) : (
              <button
                type='button'
                className='collect-btn collect-btn-ink'
                onClick={handleNext}
              >
                {t('next')}
                <Icons.chevronRight />
              </button>
            )}
          </div>
        </div>

        <p className='collect-privacy'>
          <Icons.lock />
          {t('privacyNote')}
        </p>
      </main>
    </div>
  );
}
