'use client';

import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
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
  compact?: boolean;
}

export function ProposedSectionsEditor({
  sections,
  onChange,
  disabled = false,
  className,
  compact = false
}: ProposedSectionsEditorProps) {
  const t = useTranslations('plan');
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

    onChange([...sections, { title: trimmedTitle, rationale: newRationale.trim() }]);
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
    <div className={cn(compact ? 'space-y-2' : 'space-y-3', className)}>
      {sections.length === 0 ? (
        <div
          className={cn(
            'flex flex-col items-center justify-center gap-1.5 rounded-none border border-dashed border-border bg-muted/25 text-center',
            compact ? 'px-3 py-5' : 'px-4 py-8'
          )}
        >
          <div className='flex size-8 items-center justify-center rounded-none border border-foreground/15 bg-primary text-primary-foreground'>
            <Icons.kanban className='size-3.5' />
          </div>
          <p className='text-sm font-semibold text-foreground'>{t('noSections')}</p>
          <p className='text-muted-foreground max-w-xs text-xs leading-relaxed'>
            {t('sectionsGroupHint')}
          </p>
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
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
                  onToggle={() => setExpandedIndex((prev) => (prev === index ? null : index))}
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
        <div className='space-y-2 rounded-none border border-dashed border-border bg-muted/20 p-3'>
          <p className='text-muted-foreground flex items-center gap-1.5 text-[11px] font-semibold tracking-wide uppercase'>
            <Icons.add className='size-3.5' />
            {t('newSectionLabel')}
          </p>
          <Input
            ref={newTitleRef}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder={t('sectionTitlePlaceholder')}
            className='h-9 rounded-none border-border bg-background text-sm font-medium'
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
            placeholder={t('rationaleOptional')}
            rows={2}
            className='resize-none rounded-none border-border bg-background text-sm'
          />
          <Button
            type='button'
            className='h-9 w-full rounded-none border border-foreground/20 bg-foreground text-sm font-semibold text-background hover:bg-foreground/90'
            onClick={handleAdd}
            disabled={!newTitle.trim()}
          >
            <Icons.add className='size-4' />
            {t('addSection')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
