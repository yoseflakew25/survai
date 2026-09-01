'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Question } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

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
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  const typeMeta = getQuestionTypeMeta(question.type);

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={cn(
          'group flex items-start gap-3 p-3 transition-shadow',
          isDragging && 'shadow-lg ring-2 ring-primary/20'
        )}
      >
        {/* Drag handle */}
        <button
          className='text-muted-foreground hover:text-foreground mt-1 cursor-grab touch-none active:cursor-grabbing'
          {...attributes}
          {...listeners}
        >
          <Icons.gripVertical className='h-4 w-4' />
        </button>

        {/* Question number */}
        <span className='text-muted-foreground mt-1 w-5 shrink-0 text-center text-xs font-medium'>
          {index + 1}
        </span>

        {/* Content */}
        <div className='min-w-0 flex-1 space-y-1'>
          <div className='flex items-center gap-2'>
            <p className='truncate text-sm font-medium'>{question.promptText}</p>
            {question.isRequired && (
              <Badge variant='destructive' className='shrink-0 text-[10px]'>
                Required
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-[10px]'>
              {typeMeta.label}
            </Badge>
            {question.options && (
              <span className='text-muted-foreground text-xs'>
                {question.options.length} options
              </span>
            )}
            {question.helpText && (
              <span className='text-muted-foreground text-xs'>
                · Has help text
              </span>
            )}
            {question.source !== 'manual' && (
              <Badge variant='secondary' className='text-[10px]'>
                <Icons.sparkles className='mr-0.5 h-2.5 w-2.5' />
                AI
              </Badge>
            )}
          </div>

          {/* Options preview for choice types */}
          {question.options && question.options.length > 0 && (
            <div className='flex flex-wrap gap-1 pt-1'>
              {question.options.slice(0, 4).map((opt) => (
                <span
                  key={opt.id}
                  className='bg-muted inline-block rounded px-1.5 py-0.5 text-[10px]'
                >
                  {opt.label}
                </span>
              ))}
              {question.options.length > 4 && (
                <span className='text-muted-foreground text-[10px]'>
                  +{question.options.length - 4} more
                </span>
              )}
            </div>
          )}

          {/* Scale preview */}
          {question.type === 'rating_scale' && question.validationRules && (
            <div className='flex items-center gap-1 pt-1'>
              {Array.from(
                {
                  length:
                    (question.validationRules.max ?? 5) -
                    (question.validationRules.min ?? 1) +
                    1
                },
                (_, i) => (question.validationRules?.min ?? 1) + i
              ).map((n) => (
                <span
                  key={n}
                  className='bg-muted flex size-6 items-center justify-center rounded text-[10px] font-medium'
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
            aria-label='Edit question'
          >
            <Icons.edit className='h-3.5 w-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='icon-sm'
            onClick={() => onDelete(question.id)}
            aria-label='Delete question'
            className='text-destructive hover:text-destructive'
          >
            <Icons.trash className='h-3.5 w-3.5' />
          </Button>
        </div>
      </Card>
    </div>
  );
}
