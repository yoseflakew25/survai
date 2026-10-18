'use client';

import { useState, useCallback, useRef } from 'react';
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
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ProposedSection } from '../api/types';
import { SortableSectionItem } from './sortable-section-item';

interface ProposedSectionsEditorProps {
  sections: ProposedSection[];
  onChange: (sections: ProposedSection[]) => void;
  disabled?: boolean;
  className?: string;
}

export function ProposedSectionsEditor({
  sections,
  onChange,
  disabled = false,
  className
}: ProposedSectionsEditorProps) {
  const [newTitle, setNewTitle] = useState('');
  const [newRationale, setNewRationale] = useState('');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const newTitleRef = useRef<HTMLInputElement>(null);

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
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((_, i) => `section-${i}` === active.id);
      const newIndex = sections.findIndex((_, i) => `section-${i}` === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      onChange(arrayMove(sections, oldIndex, newIndex));
      if (expandedIndex === oldIndex) {
        setExpandedIndex(newIndex);
      } else if (expandedIndex !== null) {
        if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
          setExpandedIndex(expandedIndex - 1);
        } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
          setExpandedIndex(expandedIndex + 1);
        }
      }
    },
    [sections, onChange, expandedIndex]
  );

  const handleAdd = useCallback(() => {
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) return;

    onChange([
      ...sections,
      { title: trimmedTitle, rationale: newRationale.trim() }
    ]);
    setNewTitle('');
    setNewRationale('');
    setExpandedIndex(sections.length);
    newTitleRef.current?.focus();
  }, [newTitle, newRationale, sections, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(sections.filter((_, i) => i !== index));
      setExpandedIndex(null);
    },
    [sections, onChange]
  );

  const handleUpdate = useCallback(
    (index: number, field: keyof ProposedSection, value: string) => {
      const updated = [...sections];
      updated[index] = { ...updated[index], [field]: value };
      onChange(updated);
    },
    [sections, onChange]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {sections.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center'>
          <div className='bg-brand-soft flex size-10 items-center justify-center rounded-xl'>
            <Icons.kanban className='size-4 text-foreground' />
          </div>
          <p className='text-sm font-medium text-foreground'>
            No sections yet
          </p>
          <p className='text-muted-foreground max-w-xs text-xs leading-relaxed'>
            Sections group questions into a clear flow for respondents.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sections.map((_, i) => `section-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <div className='space-y-2'>
              {sections.map((section, index) => (
                <SortableSectionItem
                  key={`section-${index}`}
                  id={`section-${index}`}
                  index={index}
                  section={section}
                  isExpanded={expandedIndex === index}
                  onToggle={() =>
                    setExpandedIndex((prev) => (prev === index ? null : index))
                  }
                  onUpdate={(field, value) => handleUpdate(index, field, value)}
                  onRemove={() => handleRemove(index)}
                  disabled={disabled}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {!disabled ? (
        <div className='space-y-2.5 rounded-xl border border-dashed border-border bg-muted/15 p-3.5'>
          <p className='text-muted-foreground flex items-center gap-1.5 text-[11px] font-medium tracking-wide uppercase'>
            <Icons.add className='size-3.5' />
            New section
          </p>
          <Input
            ref={newTitleRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder='Section title'
            className='h-10 rounded-xl font-medium'
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) {
                e.preventDefault();
                handleAdd();
              }
            }}
          />
          <Textarea
            value={newRationale}
            onChange={(e) => setNewRationale(e.target.value)}
            placeholder='Rationale — why this section matters (optional)'
            rows={2}
            className='resize-none rounded-xl text-sm'
          />
          <Button
            type='button'
            variant='outline'
            className='h-9 w-full rounded-xl font-medium'
            onClick={handleAdd}
            disabled={!newTitle.trim()}
          >
            <Icons.add className='size-4' />
            Add section
          </Button>
        </div>
      ) : null}
    </div>
  );
}
