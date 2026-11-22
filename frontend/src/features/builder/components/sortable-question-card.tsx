'use client';

import { useTranslations } from 'next-intl';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import {
  questionMetaBadgeRowClass,
  questionOptionChipClass,
  sectionIndexClass
} from '@/components/survai-panel';
import type { Question, QuestionType } from '../api/types';

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

interface SortableQuestionCardProps {
  question: Question;
  index: number;
  onEdit: (question: Question) => void;
  onDelete: (questionId: string) => void;
}

export function SortableQuestionCard({
  question,
  index,
  onEdit,
  onDelete
}: SortableQuestionCardProps) {
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: question.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'group flex items-start gap-3 rounded-none border-border p-3 transition-shadow',
          isDragging && 'shadow-lg ring-2 ring-primary/20'
        )}
      >
        {/* Drag handle */}
        <button
          className='text-muted-foreground hover:text-foreground cursor-grab touch-none active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <Icons.gripVertical className='h-4 w-4' />
        </button>

        <span className={cn(sectionIndexClass, 'mt-0.5')} aria-hidden>
          {index + 1}
        </span>

        {/* Content */}
        <div className='min-w-0 flex-1 space-y-2'>
          <div className='flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3'>
            <p className='text-base font-semibold leading-snug tracking-tight text-foreground'>
              {question.promptText}
            </p>
            <div className={questionMetaBadgeRowClass}>
              <Badge variant='meta' className='text-foreground'>
                {t(TYPE_LABEL_KEY[question.type])}
              </Badge>
              <Badge variant={question.isRequired ? 'accent' : 'meta'}>
                {question.isRequired ? t('required') : tCommon('optional')}
              </Badge>
              {question.source !== 'manual' ? (
                <Badge variant='soft' className='gap-1'>
                  <Icons.sparkles className='size-3 shrink-0 opacity-80' />
                  {question.source === 'ai_edited' ? t('sourceAiPlus') : t('sourceAi')}
                </Badge>
              ) : null}
            </div>
          </div>

          {(question.options || question.helpText) && (
            <div className='text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium'>
              {question.options ? (
                <span>{t('optionsCount', { count: question.options.length })}</span>
              ) : null}
              {question.options && question.helpText ? (
                <span aria-hidden>·</span>
              ) : null}
              {question.helpText ? <span>{t('hasHelpText')}</span> : null}
            </div>
          )}

          {/* Options preview for choice types */}
          {question.options && question.options.length > 0 && (
            <ul className='flex flex-wrap gap-1.5 pt-0.5'>
              {question.options.slice(0, 4).map((opt) => (
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
              {question.options.length > 4 && (
                <span className='text-muted-foreground text-xs'>
                  {t('moreOptions', { count: question.options.length - 4 })}
                </span>
              )}
            </ul>
          )}

          {/* Scale preview */}
          {question.type === 'rating_scale' && question.validationRules && (
            <div className='flex items-center gap-1 pt-1'>
              {Array.from(
                {
                  length:
                    (question.validationRules.max ?? 5) - (question.validationRules.min ?? 1) + 1
                },
                (_, i) => (question.validationRules?.min ?? 1) + i
              ).map((n) => (
                <span
                  key={n}
                  className='bg-muted flex size-6 items-center justify-center rounded text-xs font-medium'
                >
                  {n}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className='flex shrink-0 items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity'>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => onEdit(question)}
            aria-label={t('editQuestion')}
          >
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => onDelete(question.id)}
            aria-label={t('deleteQuestion')}
            className='text-destructive hover:text-destructive'
          >
            <Icons.trash className='h-3.5 w-3.5' />
          </Button>
        </div>
      </Card>
    </div>
  );
}
