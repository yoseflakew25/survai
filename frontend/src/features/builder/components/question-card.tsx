'use client';

import { useState, useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { Question, QuestionType } from '../api/types';
import { getQuestionTypeMeta } from '../api/types';

interface QuestionCardProps {
  question: Question;
  index: number;
  readOnly?: boolean;
  onUpdate: (data: Partial<Pick<Question, 'promptText' | 'helpText' | 'isRequired' | 'type' | 'options'>>) => void;
  onDelete: () => void;
}

export function QuestionCard({
  question,
  index,
  readOnly = false,
  onUpdate,
  onDelete
}: QuestionCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState(question.promptText);
  const [editHelpText, setEditHelpText] = useState(question.helpText ?? '');

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: question.id, disabled: readOnly });

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

  const sourceBadge =
    question.source === 'ai_generated'
      ? { label: 'AI', className: 'bg-primary/10 text-primary' }
      : question.source === 'ai_edited'
        ? { label: 'AI+', className: 'bg-primary/10 text-primary' }
        : { label: 'Manual', className: 'bg-muted text-muted-foreground' };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border bg-background p-3 transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isEditing && 'ring-1 ring-primary/20'
      )}
    >
      <div className='flex items-start gap-2'>
        {!readOnly ? (
          <button
            type='button'
            className={cn(
              'mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded',
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
          <span className='mt-1 flex h-5 w-5 shrink-0' />
        )}

        <div className='flex-1 space-y-2'>
          {isEditing ? (
            <>
              <Input
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                className='h-8 text-sm font-medium'
                placeholder='Question text'
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
                placeholder='Help text (optional)'
              />
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <Switch
                    checked={question.isRequired}
                    onCheckedChange={(checked) => onUpdate({ isRequired: checked })}
                  />
                  <span className='text-xs'>Required</span>
                </div>
                <div className='flex gap-2'>
                  <Button size='sm' onClick={handleSave}>
                    Save
                  </Button>
                  <Button size='sm' variant='ghost' onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-xs font-medium'>
                  Q{index + 1}
                </span>
                {TypeIcon && <TypeIcon className='text-muted-foreground h-3.5 w-3.5' />}
                <span className='text-muted-foreground text-xs'>{typeMeta.label}</span>
                {question.isRequired && (
                  <span className='text-destructive text-xs'>*</span>
                )}
                <Badge
                  variant='secondary'
                  className={cn('ml-auto text-[10px]', sourceBadge.className)}
                >
                  {sourceBadge.label}
                </Badge>
              </div>
              <p className='text-sm font-medium leading-relaxed'>
                {question.promptText}
              </p>
              {question.helpText && (
                <p className='text-muted-foreground text-xs'>{question.helpText}</p>
              )}
              {question.options && question.options.length > 0 && (
                <div className='mt-2 flex flex-wrap gap-1'>
                  {question.options.map((opt) => (
                    <Badge key={opt.id} variant='outline' className='text-[10px]'>
                      {opt.label}
                    </Badge>
                  ))}
                </div>
              )}
              {question.type === 'rating_scale' && question.validationRules && (
                <div className='mt-2'>
                  <Badge variant='outline' className='text-[10px]'>
                    Scale: {question.validationRules.min} - {question.validationRules.max}
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
              className='h-6 w-6'
            >
              <Icons.edit className='h-3 w-3' />
            </Button>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={onDelete}
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
