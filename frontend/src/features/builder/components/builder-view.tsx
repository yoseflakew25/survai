'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient, useSuspenseQuery } from '@tanstack/react-query';
import { surveyByIdOptions, surveyKeys } from '../api/queries';
import { reviewerKeys } from '@/features/reviewer/api/queries';
import { notFound } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import type { Survey, Section, Question, QuestionType } from '../api/types';
import { SectionCard } from './section-card';
import { AIGenerationPanel } from './ai-generation-panel';
import { SurveyPreview } from './survey-preview';
import {
  updateSurveyTitle,
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
} from '../api/service';
import Link from 'next/link';
import { useUndoRedo } from '@/hooks/use-undo-redo';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface BuilderViewProps {
  surveyId: string;
}

interface SurveyState {
  title: string;
  description: string | null;
  sections: Section[];
}

export function BuilderView({ surveyId }: BuilderViewProps) {
  return <BuilderContent surveyId={surveyId} />;
}

function BuilderContent({ surveyId }: { surveyId: string }) {
  const queryClient = useQueryClient();
  const { data: survey, refetch } = useSuspenseQuery(surveyByIdOptions(surveyId));
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  if (!survey) {
    notFound();
  }

  const questionsLocked =
    survey.status === 'published' ||
    survey.status === 'closed' ||
    survey.status === 'archived';

  const assertEditable = useCallback(() => {
    if (!questionsLocked) return true;
    toast.error('Survey locked', {
      description:
        'Questions cannot be edited while this survey is published or closed.'
    });
    return false;
  }, [questionsLocked]);

  // Initialize undo/redo state
  const initialState: SurveyState = {
    title: survey.title,
    description: survey.description,
    sections: survey.sections
  };

  const {
    state: surveyState,
    setState: setSurveyState,
    undo,
    redo,
    canUndo,
    canRedo
  } = useUndoRedo<SurveyState>(initialState, { maxHistory: 30 });

  const { title, description, sections } = surveyState;

  // Track last saved state
  const lastSavedRef = useRef<string>(JSON.stringify(initialState));

  useEffect(() => {
    lastSavedRef.current = JSON.stringify(initialState);
  }, []);

  const hasUnsavedChanges = useCallback(() => {
    return JSON.stringify(surveyState) !== lastSavedRef.current;
  }, [surveyState]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z') ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      await updateSurveyTitle(surveyId, title);
      lastSavedRef.current = JSON.stringify(surveyState);
      toast.success('Survey saved', {
        description: 'Your changes have been saved.'
      });
    } catch {
      toast.error('Failed to save', {
        description: 'Please try again.'
      });
    } finally {
      setIsSaving(false);
    }
  }, [surveyId, title, surveyState]);

  // Section handlers
  const handleAddSection = useCallback(async () => {
    if (!assertEditable()) return;
    const newSection = await addSection(surveyId, 'New Section', '');
    setSurveyState((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    toast.success('Section added');
  }, [surveyId, setSurveyState, assertEditable]);

  const handleUpdateSection = useCallback(
    async (sectionId: string, data: { title?: string; description?: string }) => {
      if (!assertEditable()) return;
      await updateSection(surveyId, sectionId, data);
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId ? { ...s, ...data, updatedAt: new Date().toISOString() } : s
        )
      }));
    },
    [surveyId, setSurveyState, assertEditable]
  );

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      if (!assertEditable()) return;
      await deleteSection(surveyId, sectionId);
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.filter((s) => s.id !== sectionId)
      }));
      toast.success('Section deleted');
    },
    [surveyId, setSurveyState, assertEditable]
  );

  const handleReorderSections = useCallback(
    async (sectionIds: string[]) => {
      if (!assertEditable()) return;
      await reorderSections(surveyId, sectionIds);
      setSurveyState((prev) => {
        const sectionMap = new Map(prev.sections.map((s) => [s.id, s]));
        return {
          ...prev,
          sections: sectionIds
            .map((id, i) => {
              const section = sectionMap.get(id);
              if (section) section.orderIndex = i;
              return section;
            })
            .filter(Boolean) as Section[]
        };
      });
    },
    [surveyId, setSurveyState, assertEditable]
  );

  // Question handlers
  const handleAddQuestion = useCallback(
    async (sectionId: string, type: QuestionType) => {
      if (!assertEditable()) return;
      const newQuestion = await addQuestion(
        surveyId,
        sectionId,
        type,
        'New Question'
      );
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? { ...s, questions: [...s.questions, newQuestion] }
            : s
        )
      }));
    },
    [surveyId, setSurveyState, assertEditable]
  );

  const handleUpdateQuestion = useCallback(
    async (questionId: string, data: Partial<Pick<Question, 'promptText' | 'helpText' | 'isRequired' | 'type' | 'options'>>) => {
      if (!assertEditable()) return;
      await updateQuestion(surveyId, questionId, data);
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => ({
          ...s,
          questions: s.questions.map((q) =>
            q.id === questionId ? { ...q, ...data, updatedAt: new Date().toISOString() } : q
          )
        }))
      }));
    },
    [surveyId, setSurveyState, assertEditable]
  );

  const handleDeleteQuestion = useCallback(
    async (questionId: string, sectionId: string) => {
      if (!assertEditable()) return;
      await deleteQuestion(surveyId, questionId);
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) =>
          s.id === sectionId
            ? { ...s, questions: s.questions.filter((q) => q.id !== questionId) }
            : s
        )
      }));
      toast.success('Question deleted');
    },
    [surveyId, setSurveyState, assertEditable]
  );

  const handleReorderQuestions = useCallback(
    async (sectionId: string, questionIds: string[]) => {
      if (!assertEditable()) return;
      await reorderQuestions(surveyId, sectionId, questionIds);
      setSurveyState((prev) => ({
        ...prev,
        sections: prev.sections.map((s) => {
          if (s.id !== sectionId) return s;
          const questionMap = new Map(s.questions.map((q) => [q.id, q]));
          return {
            ...s,
            questions: questionIds
              .map((id, i) => {
                const q = questionMap.get(id);
                if (q) q.orderIndex = i;
                return q;
              })
              .filter(Boolean) as Question[]
          };
        })
      }));
    },
    [surveyId, setSurveyState, assertEditable]
  );

  // AI generate already hard-replaced on the server — sync editor from response.
  const handleAIGenerateApplied = useCallback(
    (next: Survey) => {
      setSurveyState({
        title: next.title,
        description: next.description,
        sections: next.sections
      });
      lastSavedRef.current = JSON.stringify({
        title: next.title,
        description: next.description,
        sections: next.sections
      });
      queryClient.setQueryData(surveyKeys.detail(surveyId), next);
      queryClient.setQueryData(reviewerKeys.latest(surveyId), null);
    },
    [setSurveyState, queryClient, surveyId]
  );

  const totalQuestions = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const aiQuestions = sections.reduce(
    (sum, s) => sum + s.questions.filter((q) => q.source === 'ai_generated').length,
    0
  );

  return (
    <div className='flex h-[calc(100vh-4rem)] flex-col'>
      {/* Header */}
      <div className='border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
        <div className='flex items-center justify-between px-4 py-3 md:px-6'>
          <div className='flex items-center gap-4'>
            {isEditingTitle ? (
              <div className='flex items-center gap-2'>
                <Input
                  ref={titleInputRef}
                  value={title}
                  onChange={(e) => setSurveyState((prev) => ({ ...prev, title: e.target.value }))}
                  className='h-8 w-64 text-base font-semibold'
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingTitle(false);
                      handleSave();
                    }
                    if (e.key === 'Escape') {
                      setSurveyState((prev) => ({ ...prev, title: survey.title }));
                      setIsEditingTitle(false);
                    }
                  }}
                  onBlur={() => setIsEditingTitle(false)}
                />
              </div>
            ) : (
              <div className='flex items-center gap-2'>
                <h1 className='text-base font-semibold'>{title}</h1>
                {!questionsLocked ? (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    onClick={() => setIsEditingTitle(true)}
                  >
                    <Icons.edit className='h-3.5 w-3.5' />
                  </Button>
                ) : null}
              </div>
            )}
            <div className='flex items-center gap-2'>
              {questionsLocked ? (
                <Badge variant='outline'>Locked · {survey.status}</Badge>
              ) : null}
              {hasUnsavedChanges() && !questionsLocked ? (
                <Badge variant='outline' className='border-amber-500 text-amber-600'>
                  Unsaved
                </Badge>
              ) : null}
              <Badge variant='secondary'>
                {sections.length} sections · {totalQuestions} questions
              </Badge>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='ghost'
              size='default'
              onClick={undo}
              disabled={!canUndo}
            >
              <Icons.chevronsLeft className='mr-1 h-4 w-4' />
              Undo
            </Button>
            <Button
              variant='ghost'
              size='default'
              onClick={redo}
              disabled={!canRedo}
            >
              Redo
              <Icons.chevronsRight className='ml-1 h-4 w-4' />
            </Button>
            <Separator orientation='vertical' className='h-6' />
            <Button
              variant='outline'
              size='default'
              onClick={handleSave}
              disabled={isSaving || questionsLocked}
            >
              {isSaving ? (
                <Icons.spinner className='mr-2 h-4 w-4 animate-spin' />
              ) : (
                <Icons.check className='mr-2 h-4 w-4' />
              )}
              Save
            </Button>
            <Link href={`/dashboard/surveys/${surveyId}/review`}>
              <Button size='default'>
                Continue to Review
                <Icons.arrowRight className='ml-2 h-4 w-4' />
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className='flex flex-1 overflow-hidden'>
        {/* Sections list */}
        <div className='flex-1 overflow-y-auto p-4 md:p-6'>
          <div className='mx-auto max-w-3xl space-y-4'>
            {sections.length === 0 ? (
              <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center'>
                <Icons.forms className='text-muted-foreground/40 mb-4 h-12 w-12' />
                <h3 className='text-lg font-semibold'>No sections yet</h3>
                <p className='text-muted-foreground mt-1 text-sm'>
                  Add sections to organize your survey questions, or use AI to generate them.
                </p>
                {!questionsLocked ? (
                  <Button className='mt-4' onClick={handleAddSection}>
                    <Icons.add className='mr-2 h-4 w-4' />
                    Add Section
                  </Button>
                ) : null}
              </div>
            ) : (
              sections.map((section, index) => (
                <SectionCard
                  key={section.id}
                  section={section}
                  index={index}
                  totalSections={sections.length}
                  readOnly={questionsLocked}
                  onUpdate={(data) => handleUpdateSection(section.id, data)}
                  onDelete={() => handleDeleteSection(section.id)}
                  onAddQuestion={(type) => handleAddQuestion(section.id, type)}
                  onUpdateQuestion={(questionId, data) =>
                    handleUpdateQuestion(questionId, data)
                  }
                  onDeleteQuestion={(questionId) =>
                    handleDeleteQuestion(questionId, section.id)
                  }
                  onReorderQuestions={(questionIds) =>
                    handleReorderQuestions(section.id, questionIds)
                  }
                />
              ))
            )}

            {sections.length > 0 && !questionsLocked ? (
              <Button
                variant='outline'
                className='w-full border-dashed'
                onClick={handleAddSection}
              >
                <Icons.add className='mr-2 h-4 w-4' />
                Add Section
              </Button>
            ) : null}
          </div>
        </div>

        {/* Sidebar */}
        <div className='hidden w-80 border-l bg-muted/30 lg:block'>
          <div className='h-full overflow-y-auto p-4'>
            <div className='space-y-4'>
              {/* AI Generation */}
              <AIGenerationPanel
                surveyId={surveyId}
                planId={survey.planId}
                goalPreview={survey.title}
                locked={questionsLocked}
                onApplied={handleAIGenerateApplied}
              />

              <Separator />

              {/* Survey Stats */}
              <div className='rounded-lg border bg-background p-4'>
                <h3 className='mb-3 text-sm font-semibold'>Survey Stats</h3>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Sections</span>
                    <span className='font-medium'>{sections.length}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Questions</span>
                    <span className='font-medium'>{totalQuestions}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>AI-generated</span>
                    <span className='font-medium'>{aiQuestions}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Manual</span>
                    <span className='font-medium'>{totalQuestions - aiQuestions}</span>
                  </div>
                  <Separator className='my-2' />
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Required</span>
                    <span className='font-medium'>
                      {sections.reduce(
                        (sum, s) => sum + s.questions.filter((q) => q.isRequired).length,
                        0
                      )}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-muted-foreground'>Optional</span>
                    <span className='font-medium'>
                      {sections.reduce(
                        (sum, s) => sum + s.questions.filter((q) => !q.isRequired).length,
                        0
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preview */}
              <SurveyPreview
                title={title}
                sections={sections}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
