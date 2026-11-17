'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Section, Question, QuestionType } from '../api/types';

const TYPE_LABEL_KEY: Record<
  QuestionType,
  | 'shortText'
  | 'longText'
  | 'singleChoice'
  | 'multipleChoice'
  | 'dropdown'
  | 'ratingScale'
  | 'number'
  | 'date'
> = {
  short_text: 'shortText',
  long_text: 'longText',
  single_choice: 'singleChoice',
  multiple_choice: 'multipleChoice',
  dropdown: 'dropdown',
  rating_scale: 'ratingScale',
  number: 'number',
  date: 'date'
};

const TYPE_DESC_KEY: Record<
  QuestionType,
  | 'shortTextDesc'
  | 'longTextDesc'
  | 'singleChoiceDesc'
  | 'multipleChoiceDesc'
  | 'dropdownDesc'
  | 'ratingScaleDesc'
  | 'numberDesc'
  | 'dateDesc'
> = {
  short_text: 'shortTextDesc',
  long_text: 'longTextDesc',
  single_choice: 'singleChoiceDesc',
  multiple_choice: 'multipleChoiceDesc',
  dropdown: 'dropdownDesc',
  rating_scale: 'ratingScaleDesc',
  number: 'numberDesc',
  date: 'dateDesc'
};
import { QuestionCard } from './question-card';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface SectionCardProps {
  section: Section;
  index: number;
  totalSections: number;
  readOnly?: boolean;
  onUpdate: (data: { title?: string; description?: string }) => void;
  onDelete: () => void;
  onAddQuestion: (type: QuestionType) => void;
  onUpdateQuestion: (
    questionId: string,
    data: Partial<Pick<Question, 'promptText' | 'helpText' | 'isRequired' | 'type' | 'options'>>
  ) => void;
  onDeleteQuestion: (questionId: string) => void;
  onReorderQuestions: (questionIds: string[]) => void;
}

export function SectionCard({
  section,
  index,
  totalSections,
  readOnly = false,
  onUpdate,
  onDelete,
  onAddQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onReorderQuestions
}: SectionCardProps) {
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [editDescription, setEditDescription] = useState(section.description ?? '');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      if (readOnly) return;
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = section.questions.findIndex((q) => q.id === active.id);
        const newIndex = section.questions.findIndex((q) => q.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          const newOrder = arrayMove(
            section.questions.map((q) => q.id),
            oldIndex,
            newIndex
          );
          onReorderQuestions(newOrder);
        }
      }
    },
    [section.questions, onReorderQuestions, readOnly]
  );

  const handleSaveEdit = useCallback(() => {
    onUpdate({
      title: editTitle.trim() || section.title,
      description: editDescription.trim() || undefined
    });
    setIsEditing(false);
  }, [editTitle, editDescription, onUpdate, section.title]);

  const questionIds = section.questions.map((q) => q.id);

  return (
    <Card className='overflow-hidden'>
      <CardHeader className='bg-brand-soft py-3'>
        <div className='flex items-start justify-between gap-3'>
          <div className='flex items-start gap-3'>
            <span className='bg-primary text-primary-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-bold'>
              {index + 1}
            </span>
            {isEditing ? (
              <div className='space-y-2'>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className='h-8 font-semibold'
                  placeholder={t('sectionTitlePlaceholder')}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setIsEditing(false);
                  }}
                />
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className='min-h-[60px] resize-none text-xs'
                  placeholder={t('sectionDescriptionPlaceholder')}
                />
                <div className='flex gap-2'>
                  <Button size='sm' onClick={handleSaveEdit}>
                    {tCommon('save')}
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => setIsEditing(false)}>
                    {tCommon('cancel')}
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <h3 className='font-semibold'>{section.title}</h3>
                {section.description && (
                  <p className='text-muted-foreground  text-sm'>{section.description}</p>
                )}
              </div>
            )}
          </div>
          <div className='flex items-center gap-1'>
            <Badge variant='secondary' className='text-xs'>
              {t('questionCount', { count: section.questions.length })}
            </Badge>
            {!readOnly && !isEditing ? (
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={() => setIsEditing(true)}
                aria-label={t('editSection')}
              >
                <Icons.edit className='h-3.5 w-3.5' />
              </Button>
            ) : null}
            {!readOnly ? (
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={onDelete}
                aria-label={t('deleteSection')}
                className='text-muted-foreground hover:text-destructive'
              >
                <Icons.trash className='h-3.5 w-3.5' />
              </Button>
            ) : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className='p-4'>
        {section.questions.length === 0 ? (
          <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center'>
            <Icons.forms className='text-muted-foreground/40 mb-2 h-8 w-8' />
            <p className='text-muted-foreground text-sm'>{t('noQuestionsShort')}</p>
            <p className='text-muted-foreground/60  text-xs'>
              {readOnly ? t('questionsLocked') : t('addQuestionsHint')}
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={questionIds} strategy={verticalListSortingStrategy}>
              <div className='space-y-2'>
                {section.questions.map((question, qIndex) => (
                  <QuestionCard
                    key={question.id}
                    question={question}
                    index={qIndex}
                    readOnly={readOnly}
                    onUpdate={(data) => onUpdateQuestion(question.id, data)}
                    onDelete={() => onDeleteQuestion(question.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!readOnly ? (
          <div className='mt-3'>
            <DropdownMenu>
              <DropdownMenuTrigger
                render={<Button variant='outline' size='sm' className='w-full border-dashed' />}
              >
                <Icons.add className='mr-2 h-3.5 w-3.5' />
                {t('addQuestion')}
              </DropdownMenuTrigger>
              <DropdownMenuContent align='start' className='w-56'>
                {[
                  { type: 'short_text' as QuestionType, icon: 'text' },
                  { type: 'long_text' as QuestionType, icon: 'text' },
                  { type: 'single_choice' as QuestionType, icon: 'circle' },
                  { type: 'multiple_choice' as QuestionType, icon: 'check' },
                  { type: 'dropdown' as QuestionType, icon: 'chevronDown' },
                  { type: 'rating_scale' as QuestionType, icon: 'star' },
                  { type: 'number' as QuestionType, icon: 'code' },
                  { type: 'date' as QuestionType, icon: 'calendar' }
                ].map(({ type, icon }) => {
                  const IconComponent = Icons[icon as keyof typeof Icons];
                  return (
                    <DropdownMenuItem
                      key={type}
                      onClick={() => onAddQuestion(type)}
                      className='flex items-center gap-2'
                    >
                      {IconComponent && <IconComponent className='text-muted-foreground h-4 w-4' />}
                      <div>
                        <p className='text-sm font-medium'>{t(TYPE_LABEL_KEY[type])}</p>
                        <p className='text-muted-foreground text-xs'>{t(TYPE_DESC_KEY[type])}</p>
                      </div>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
