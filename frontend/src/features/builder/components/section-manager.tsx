'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Section, Question, QuestionType, QuestionOption } from '../api/types';
import { SortableQuestionCard } from './sortable-question-card';
import { QuestionTypeSelector } from './question-type-selector';
import { QuestionEditor } from './question-editor';
import {
  addSection,
  updateSection,
  deleteSection,
  reorderSections,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions
} from '../api/service';
import { toast } from 'sonner';

interface SectionManagerProps {
  surveyId: string;
  sections: Section[];
  onSectionsChange: (sections: Section[]) => void;
}

// ---- Sortable Section ----

function SortableSection({
  section,
  index,
  onEdit,
  onDelete,
  onQuestionEdit,
  onQuestionDelete,
  onAddQuestion
}: {
  section: Section;
  index: number;
  onEdit: (sectionId: string, title: string, description: string) => void;
  onDelete: (sectionId: string) => void;
  onQuestionEdit: (question: Question) => void;
  onQuestionDelete: (questionId: string) => void;
  onAddQuestion: (sectionId: string, type: QuestionType, promptText: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  function handleSaveEdit() {
    onEdit(section.id, title, description);
    setIsEditing(false);
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'transition-shadow',
          isDragging && 'shadow-lg ring-2 ring-primary/20'
        )}
      >
        <CardHeader className='pb-3'>
          <div className='flex items-start gap-2'>
            {/* Drag handle */}
            <button
              className='text-muted-foreground hover:text-foreground mt-1 cursor-grab touch-none active:cursor-grabbing'
              {...attributes}
              {...listeners}
            >
              <Icons.gripVertical className='h-4 w-4' />
            </button>

            {/* Section number */}
            <span className='text-muted-foreground mt-1 w-5 shrink-0 text-center text-xs font-medium'>
              {index + 1}
            </span>

            {/* Title / edit mode */}
            <div className='min-w-0 flex-1'>
              {isEditing ? (
                <div className='space-y-2'>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className='h-8 text-sm font-medium'
                    placeholder='Section title'
                  />
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className='resize-none text-xs'
                    rows={2}
                    placeholder='Section description (optional)'
                  />
                  <div className='flex gap-1'>
                    <Button  onClick={handleSaveEdit}>
                      Save
                    </Button>
                    <Button
                      
                      variant='ghost'
                      onClick={() => setIsEditing(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <CardTitle className='text-sm'>{section.title}</CardTitle>
                  {section.description && (
                    <p className='text-muted-foreground mt-0.5 text-xs'>
                      {section.description}
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            {!isEditing && (
              <div className='flex shrink-0 items-center gap-1'>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => setIsEditing(true)}
                  aria-label='Edit section'
                >
                  <Icons.edit className='h-3.5 w-3.5' />
                </Button>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  {isCollapsed ? (
                    <Icons.chevronDown className='h-3.5 w-3.5' />
                  ) : (
                    <Icons.chevronUp className='h-3.5 w-3.5' />
                  )}
                </Button>
                <Button
                  variant='ghost'
                  size='icon-sm'
                  onClick={() => onDelete(section.id)}
                  aria-label='Delete section'
                  className='text-destructive hover:text-destructive'
                >
                  <Icons.trash className='h-3.5 w-3.5' />
                </Button>
              </div>
            )}
          </div>
        </CardHeader>

        {/* Questions */}
        {!isCollapsed && (
          <CardContent className='pt-0'>
            <div className='space-y-2'>
              {section.questions.length === 0 ? (
                <p className='text-muted-foreground py-4 text-center text-xs'>
                  No questions yet. Add one below.
                </p>
              ) : (
                <DndContext
                  sensors={useSensors(
                    useSensor(PointerSensor, {
                      activationConstraint: { distance: 5 }
                    }),
                    useSensor(KeyboardSensor, {
                      coordinateGetter: sortableKeyboardCoordinates
                    })
                  )}
                  collisionDetection={closestCenter}
                  onDragEnd={(event: DragEndEvent) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;

                    const oldIndex = section.questions.findIndex(
                      (q) => q.id === active.id
                    );
                    const newIndex = section.questions.findIndex(
                      (q) => q.id === over.id
                    );
                    const reordered = arrayMove(
                      section.questions,
                      oldIndex,
                      newIndex
                    ).map((q, i) => ({ ...q, orderIndex: i }));

                    onAddQuestion(section.id, 'short_text', ''); // trigger parent update
                    // Actually we need to call reorderQuestions
                    reorderQuestions(
                      section.id,
                      reordered.map((q) => q.id)
                    );
                  }}
                >
                  <SortableContext
                    items={section.questions.map((q) => q.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {section.questions.map((question, qIdx) => (
                      <SortableQuestionCard
                        key={question.id}
                        question={question}
                        index={qIdx}
                        onEdit={onQuestionEdit}
                        onDelete={onQuestionDelete}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}

              {/* Add question */}
              <div className='pt-2'>
                <QuestionTypeSelector
                  onSelect={(type, promptText) =>
                    onAddQuestion(section.id, type, promptText)
                  }
                />
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

// ---- Main Section Manager ----

export function SectionManager({
  surveyId,
  sections,
  onSectionsChange
}: SectionManagerProps) {
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState('');
  const [isAddingSection, setIsAddingSection] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // ---- Section handlers ----

  const handleSectionDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      const reordered = arrayMove(sections, oldIndex, newIndex).map((s, i) => ({
        ...s,
        orderIndex: i
      }));

      onSectionsChange(reordered);
      await reorderSections(
        surveyId,
        reordered.map((s) => s.id)
      );
    },
    [sections, onSectionsChange, surveyId]
  );

  const handleAddSection = useCallback(async () => {
    if (!newSectionTitle.trim()) return;
    try {
      const section = await addSection(
        surveyId,
        newSectionTitle.trim()
      );
      onSectionsChange([...sections, section]);
      setNewSectionTitle('');
      setIsAddingSection(false);
      toast.success('Section added');
    } catch {
      toast.error('Failed to add section');
    }
  }, [newSectionTitle, surveyId, sections, onSectionsChange]);

  const handleEditSection = useCallback(
    async (sectionId: string, title: string, description: string) => {
      const updated = await updateSection(sectionId, { title, description });
      if (updated) {
        onSectionsChange(
          sections.map((s) => (s.id === sectionId ? { ...s, title, description } : s))
        );
      }
    },
    [sections, onSectionsChange]
  );

  const handleDeleteSection = useCallback(
    async (sectionId: string) => {
      await deleteSection(sectionId);
      onSectionsChange(sections.filter((s) => s.id !== sectionId));
      toast.success('Section deleted');
    },
    [sections, onSectionsChange]
  );

  // ---- Question handlers ----

  const handleAddQuestion = useCallback(
    async (sectionId: string, type: QuestionType, promptText: string) => {
      if (!promptText.trim()) return;
      try {
        const question = await addQuestion(sectionId, type, promptText);
        onSectionsChange(
          sections.map((s) =>
            s.id === sectionId
              ? { ...s, questions: [...s.questions, question] }
              : s
          )
        );
        toast.success('Question added');
      } catch {
        toast.error('Failed to add question');
      }
    },
    [sections, onSectionsChange]
  );

  const handleEditQuestion = useCallback((question: Question) => {
    setEditingQuestion(question);
    setQuestionEditorOpen(true);
  }, []);

  const handleSaveQuestion = useCallback(
    async (data: {
      promptText: string;
      helpText: string | null;
      isRequired: boolean;
      type: QuestionType;
      options: QuestionOption[] | null;
    }) => {
      if (!editingQuestion) return;
      const updated = await updateQuestion(editingQuestion.id, data);
      if (updated) {
        onSectionsChange(
          sections.map((s) =>
            s.id === editingQuestion.sectionId
              ? {
                  ...s,
                  questions: s.questions.map((q) =>
                    q.id === editingQuestion.id ? updated : q
                  )
                }
              : s
          )
        );
        toast.success('Question updated');
      }
    },
    [editingQuestion, sections, onSectionsChange]
  );

  const handleDeleteQuestion = useCallback(
    async (questionId: string) => {
      await deleteQuestion(questionId);
      onSectionsChange(
        sections.map((s) => ({
          ...s,
          questions: s.questions.filter((q) => q.id !== questionId)
        }))
      );
      toast.success('Question deleted');
    },
    [sections, onSectionsChange]
  );

  return (
    <div className='space-y-4'>
      {/* Sections list with DnD */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-4'>
            {sections.map((section, index) => (
              <SortableSection
                key={section.id}
                section={section}
                index={index}
                onEdit={handleEditSection}
                onDelete={handleDeleteSection}
                onQuestionEdit={handleEditQuestion}
                onQuestionDelete={handleDeleteQuestion}
                onAddQuestion={handleAddQuestion}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add section */}
      {isAddingSection ? (
        <Card className='border-dashed'>
          <CardContent className='pt-6'>
            <div className='space-y-3'>
              <Input
                value={newSectionTitle}
                onChange={(e) => setNewSectionTitle(e.target.value)}
                placeholder='Section title'
                className='text-sm'
                autoFocus
              />
              <div className='flex gap-2'>
                <Button  onClick={handleAddSection} disabled={!newSectionTitle.trim()}>
                  Add Section
                </Button>
                <Button
                  
                  variant='ghost'
                  onClick={() => {
                    setIsAddingSection(false);
                    setNewSectionTitle('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Button
          variant='outline'
          className='w-full border-dashed'
          onClick={() => setIsAddingSection(true)}
        >
          <Icons.add className='mr-2 h-4 w-4' />
          Add Section
        </Button>
      )}

      {/* Question editor sheet */}
      <QuestionEditor
        question={editingQuestion}
        open={questionEditorOpen}
        onOpenChange={setQuestionEditorOpen}
        onSave={handleSaveQuestion}
      />
    </div>
  );
}
