'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  questionMetaBadgeRowClass,
  questionOptionChipClass,
  sectionIndexClass
} from '@/components/survai-panel';
import type { Question, QuestionType } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

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

interface QuestionCardProps {
  question: Question;
  index: number;
  readOnly?: boolean;
  onUpdate: (
    data: Partial<Pick<Question, 'promptText' | 'helpText' | 'isRequired' | 'type' | 'options'>>
  ) => void;
  onDelete: () => void;
}

export function QuestionCard({
  question,
  index,
  readOnly = false,
  onUpdate,
  onDelete
}: QuestionCardProps) {
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(question.promptText);
  const [editHelpText, setEditHelpText] = useState(question.helpText ?? '');

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id,
    disabled: readOnly
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined
  };

  const typeMeta = getQuestionTypeMeta(question.type);
  const TypeIcon = Icons[typeMeta.icon as keyof typeof Icons];

  const handleSave = useCallback(() => {
    onUpdate({
      promptText: editPrompt.trim() || question.promptText,
      helpText: editHelpText.trim() || null
    });
    setIsEditing(false);
  }, [editPrompt, editHelpText, onUpdate, question.promptText]);

  const sourceLabel =
    question.source === 'ai_generated'
      ? t('sourceAi')
      : question.source === 'ai_edited'
        ? t('sourceAiPlus')
        : t('manual');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-none border border-border bg-card p-3 transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isEditing && 'ring-1 ring-primary/20'
      )}
    >
      <div className='flex items-start gap-3'>
        {!readOnly ? (
          <button
            type='button'
            className={cn(
              ' flex h-5 w-5 shrink-0 items-center justify-center rounded',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'cursor-grab active:cursor-grabbing transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
            {...attributes}
            {...listeners}
          >
            <Icons.gripVertical className='h-3.5 w-3.5' />
          </button>
        ) : (
          <span className=' flex h-5 w-5 shrink-0' />
        )}

        <span className={cn(sectionIndexClass, 'mt-0.5')} aria-hidden>
          {index + 1}
        </span>

        <div className='min-w-0 flex-1 space-y-2.5'>
          {isEditing ? (
            <>
              <Input
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className='h-8 text-sm font-medium'
                placeholder={t('questionText')}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <Input
                value={editHelpText}
                onChange={(e) => setEditHelpText(e.target.value)}
                className='h-7 text-xs'
                placeholder={t('helpTextOptional')}
              />
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={question.isRequired}
                    onCheckedChange={(checked) => onUpdate({ isRequired: checked })}
                  />
                  <span className='text-xs'>{t('required')}</span>
                </div>
                <div className='flex gap-2'>
                  <Button size='sm' onClick={handleSave}>
                    {tCommon('save')}
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => setIsEditing(false)}>
                    {tCommon('cancel')}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'>
                <p className='text-base font-semibold leading-snug tracking-tight text-foreground'>
                  {question.promptText}
                </p>
                <div className={questionMetaBadgeRowClass}>
                  <Badge variant='meta' className='gap-1.5 text-foreground'>
                    {TypeIcon ? <TypeIcon className='size-3.5 shrink-0 opacity-60' /> : null}
                    {t(TYPE_LABEL_KEY[question.type])}
                  </Badge>
                  <Badge variant={question.isRequired ? 'accent' : 'meta'}>
                    {question.isRequired ? t('required') : tCommon('optional')}
                  </Badge>
                  {question.source !== 'manual' ? (
                    <Badge variant='soft' className='gap-1'>
                      <Icons.sparkles className='size-3 shrink-0 opacity-80' />
                      {sourceLabel}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {question.helpText && (
                <p className='text-muted-foreground text-xs'>{question.helpText}</p>
              )}
              {question.options && question.options.length > 0 && (
                <ul className='flex flex-wrap gap-1.5'>
                  {question.options.map((opt) => (
                    <li key={opt.id} className={questionOptionChipClass}>
                      <span
                        className={cn(
                          'size-1.5 shrink-0 bg-muted-foreground/60',
                          question.type === 'multiple_choice'
                            ? 'rounded-[1px]'
                            : 'rounded-full'
                        )}
                        aria-hidden
                      />
                      {opt.label}
                    </li>
                  ))}
                </ul>
              )}
              {question.type === 'rating_scale' && question.validationRules && (
                <div className='mt-2'>
                  <Badge variant='outline' className='text-xs'>
                    {t('scaleRange', {
                      min: question.validationRules.min ?? 1,
                      max: question.validationRules.max ?? 5
                    })}
                  </Badge>
                </div>
              )}
            </>
          )}
        </div>

        {!readOnly && !isEditing ? (
          <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => setIsEditing(true)}
              aria-label={t('editQuestion')}
              className='h-6 w-6'
            >
              <Icons.edit className='h-3 w-3' />
            </Button>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={onDelete}
              aria-label={t('deleteQuestion')}
              className='h-6 w-6 text-muted-foreground hover:text-destructive'
            >
              <Icons.close className='h-3 w-3' />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
