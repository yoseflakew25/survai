'use client';

import { useState, useCallback, useRef } from 'react';
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
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = sections.findIndex((_, i) => `section-${i}` === active.id);
        const newIndex = sections.findIndex((_, i) => `section-${i}` === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          onChange(arrayMove(sections, oldIndex, newIndex));
          // Update expanded index if needed
          if (expandedIndex === oldIndex) {
            setExpandedIndex(newIndex);
          } else if (expandedIndex !== null) {
            if (oldIndex < expandedIndex && newIndex >= expandedIndex) {
              setExpandedIndex(expandedIndex - 1);
            } else if (oldIndex > expandedIndex && newIndex <= expandedIndex) {
              setExpandedIndex(expandedIndex + 1);
            }
          }
        }
      }
    },
    [sections, onChange, expandedIndex]
  );

  const handleAdd = useCallback(() => {
    const trimmedTitle = newTitle.trim();
    const trimmedRationale = newRationale.trim();
    if (!trimmedTitle) return;

    onChange([...sections, { title: trimmedTitle, rationale: trimmedRationale }]);
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

  const toggleExpanded = useCallback((index: number) => {
    setExpandedIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {sections.length === 0 && (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center'>
          <Icons.kanban className='text-muted-foreground/40 mb-2 h-8 w-8' />
          <p className='text-primary text-sm'>
             Add additional sections manually.
          </p>
          <p className='text-muted-foreground/60 mt-1 text-xs'>
            Sections organize your survey questions into logical groups
          </p>
        </div>
      )}

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
                onToggle={() => toggleExpanded(index)}
                onUpdate={(field, value) => handleUpdate(index, field, value)}
                onRemove={() => handleRemove(index)}
                disabled={disabled}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className='space-y-2 rounded-lg border border-dashed p-3'>
          <div className='flex items-center gap-2'>
            <Icons.add className='text-muted-foreground h-4 w-4' />
            <span className='text-muted-foreground text-xs font-medium'>Add New Section</span>
          </div>
          <Input
            ref={newTitleRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder='Section title'
            className='h-9 font-medium'
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
            className='resize-none text-xs'
          />
          <Button
            variant='outline'
            size='default'
            onClick={handleAdd}
            disabled={!newTitle.trim()}
          >
            <Icons.add className='mr-1 h-4 w-4' />
            Add Section
          </Button>
        </div>
      )}
    </div>
  );
}
