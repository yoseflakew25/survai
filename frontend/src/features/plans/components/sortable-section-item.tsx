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
        'group overflow-hidden rounded-xl border border-border bg-card transition-[box-shadow,border-color]',
        isDragging && 'opacity-95 shadow-md ring-1 ring-border',
        isExpanded &&
          'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] shadow-sm'
      )}
    >
      <div className='flex items-center gap-1.5 px-2 py-2 sm:gap-2 sm:px-2.5'>
        {!disabled ? (
          <button
            type='button'
            className='text-muted-foreground hover:text-foreground hover:bg-muted/60 flex size-8 shrink-0 cursor-grab items-center justify-center rounded-lg transition-colors active:cursor-grabbing'
            {...attributes}
            {...listeners}
            aria-label={`Drag to reorder section ${index + 1}`}
          >
            <Icons.gripVertical className='size-4' />
          </button>
        ) : null}

        <span
          className={cn(
            'flex size-7 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold tabular-nums',
            isExpanded
              ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground'
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
            'h-9 flex-1 rounded-lg border-transparent bg-transparent px-2 text-sm font-semibold shadow-none focus-visible:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring/40',
            !section.title && 'text-muted-foreground italic'
          )}
          onClick={() => {
            if (!isExpanded) onToggle();
          }}
        />

        {!disabled ? (
          <div className='flex shrink-0 items-center gap-0.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              onClick={onToggle}
              className='size-8 rounded-lg'
              aria-expanded={isExpanded}
              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            >
              <Icons.chevronsUpDown className='size-3.5' />
            </Button>
            <Button
              type='button'
              variant='ghost'
              size='icon-sm'
              onClick={onRemove}
              className='text-muted-foreground hover:text-destructive size-8 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
              aria-label={`Remove section ${index + 1}`}
            >
              <Icons.close className='size-3.5' />
            </Button>
          </div>
        ) : null}
      </div>

      {isExpanded ? (
        <div className='border-border animate-in fade-in slide-in-from-top-1 space-y-2 border-t bg-muted/20 px-3 py-3 duration-150 sm:px-4'>
          <label className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
            Rationale
          </label>
          <Textarea
            value={section.rationale}
            onChange={(e) => onUpdate('rationale', e.target.value)}
            placeholder='Why this section exists — what it helps measure…'
            disabled={disabled}
            rows={2}
            className='border-border bg-card min-h-[4rem] resize-none rounded-xl text-sm'
          />
          {!section.rationale.trim() ? (
            <p className='text-muted-foreground text-[11px] leading-relaxed'>
              A short rationale helps your team keep the survey focused.
            </p>
          ) : null}
        </div>
      ) : section.rationale ? (
        <p className='text-muted-foreground border-border line-clamp-1 border-t px-3 py-2 text-xs sm:px-4'>
          {section.rationale}
        </p>
      ) : null}
    </div>
  );
}
