'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ProposedSection } from '../api/types';

interface SortableSectionItemProps {
  id: string;
  index: number;
  section: ProposedSection;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdate: (field: keyof ProposedSection, value: string) => void;
  onRemove: () => void;
  disabled?: boolean;
}

export function SortableSectionItem({
  id,
  index,
  section,
  isExpanded,
  onToggle,
  onUpdate,
  onRemove,
  disabled = false
}: SortableSectionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id, disabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border transition-all',
        isDragging && 'opacity-50 shadow-lg',
        isExpanded
          ? 'bg-primary/5 ring-1 ring-primary/20'
          : 'hover:border-primary/20'
      )}
    >
      {/* Section Header */}
      <div className='flex items-center gap-2 p-3'>
        {!disabled && (
          <button
            type='button'
            className={cn(
              'flex h-6 w-6 shrink-0 items-center justify-center rounded',
              'text-muted-foreground hover:text-foreground hover:bg-muted',
              'cursor-grab active:cursor-grabbing transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-primary/20'
            )}
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder section ${index + 1}`}
          >
            <Icons.gripVertical className='h-4 w-4' />
          </button>
        )}
        <span
          className={cn(
            'flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-semibold transition-colors',
            isExpanded
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          {index + 1}
        </span>
        <Input
          value={section.title}
          onChange={(e) => onUpdate('title', e.target.value)}
          placeholder='Section title'
          disabled={disabled}
          className={cn(
            'h-8 flex-1 border-transparent bg-transparent font-medium focus:border-primary focus:bg-background',
            !section.title && 'text-muted-foreground italic'
          )}
          onClick={() => !isExpanded && onToggle()}
        />
        {!disabled && (
          <div className='flex items-center gap-1'>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={onToggle}
              className='h-7 w-7'
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              <Icons.chevronsUpDown className='h-3.5 w-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={onRemove}
              className='h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity'
              aria-label={`Remove section ${index + 1}`}
            >
              <Icons.close className='h-3.5 w-3.5' />
            </Button>
          </div>
        )}
      </div>

      {/* Section Rationale (expandable) */}
      {isExpanded && (
        <div className='border-t px-3 pb-3 pt-2 animate-in fade-in slide-in-from-top-1 duration-150'>
          <label className='text-muted-foreground mb-1.5 block text-xs font-medium'>
            Rationale
          </label>
          <Textarea
            value={section.rationale}
            onChange={(e) => onUpdate('rationale', e.target.value)}
            placeholder='Why does this section exist? What does it help measure?'
            disabled={disabled}
            rows={2}
            className='resize-none text-xs'
          />
          <p className='text-muted-foreground/60 mt-1.5 text-[10px]'>
            Explain the purpose of this section to help your team understand its importance
          </p>
        </div>
      )}
    </div>
  );
}
