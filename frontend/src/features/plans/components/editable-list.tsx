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
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { SortableItem } from './sortable-item';

interface EditableListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  addLabel?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
}

export function EditableList({
  items,
  onChange,
  placeholder = 'Enter item…',
  addLabel = 'Add item',
  emptyMessage = 'No items yet',
  disabled = false,
  className
}: EditableListProps) {
  const [newItem, setNewItem] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const newItemRef = useRef<HTMLInputElement>(null);

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

      const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id);
      const newIndex = items.findIndex((_, i) => `item-${i}` === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        onChange(arrayMove(items, oldIndex, newIndex));
      }
    },
    [items, onChange]
  );

  const handleAdd = useCallback(() => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
    newItemRef.current?.focus();
  }, [newItem, items, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
      setEditingIndex(null);
    },
    [items, onChange]
  );

  const handleUpdate = useCallback(
    (index: number, value: string) => {
      const updated = [...items];
      updated[index] = value;
      onChange(updated);
    },
    [items, onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, index?: number) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (index !== undefined) {
          setEditingIndex(null);
          if (index === items.length - 1) newItemRef.current?.focus();
        } else {
          handleAdd();
        }
      } else if (e.key === 'Escape') {
        setEditingIndex(null);
      } else if (
        e.key === 'Backspace' &&
        index !== undefined &&
        items[index] === ''
      ) {
        e.preventDefault();
        handleRemove(index);
        if (index > 0) setEditingIndex(index - 1);
      }
    },
    [handleAdd, handleRemove, items]
  );

  return (
    <div className={cn('space-y-3', className)}>
      {items.length === 0 ? (
        <div className='flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center'>
          <div className='bg-brand-soft flex size-10 items-center justify-center rounded-xl'>
            <Icons.forms className='size-4 text-foreground' />
          </div>
          <p className='text-sm font-medium text-foreground'>{emptyMessage}</p>
          <p className='text-muted-foreground text-xs'>
            Add one below, or generate more with AI.
          </p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={items.map((_, i) => `item-${i}`)}
            strategy={verticalListSortingStrategy}
          >
            <ul className='divide-border overflow-hidden rounded-xl border border-border divide-y'>
              {items.map((item, index) => (
                <SortableItem
                  key={`item-${index}`}
                  id={`item-${index}`}
                  index={index}
                  disabled={disabled}
                  className='bg-card'
                >
                  <div
                    className={cn(
                      'group flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-2 transition-colors',
                      editingIndex === index && 'bg-brand-soft/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-lg font-mono text-[11px] font-bold tabular-nums transition-colors',
                        editingIndex === index
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground'
                      )}
                    >
                      {index + 1}
                    </span>
                    <Input
                      value={item}
                      onChange={(e) => handleUpdate(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, index)}
                      onFocus={() => setEditingIndex(index)}
                      onBlur={() => {
                        window.setTimeout(() => setEditingIndex(null), 150);
                      }}
                      placeholder={placeholder}
                      disabled={disabled}
                      className={cn(
                        'h-9 flex-1 rounded-lg border-transparent bg-transparent px-2 text-sm font-medium shadow-none focus-visible:border-border focus-visible:bg-background focus-visible:ring-1 focus-visible:ring-ring/40',
                        !item && 'text-muted-foreground italic'
                      )}
                    />
                    {!disabled ? (
                      <Button
                        type='button'
                        variant='ghost'
                        size='icon-sm'
                        onClick={() => handleRemove(index)}
                        className='text-muted-foreground hover:text-destructive size-8 shrink-0 rounded-lg opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100'
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Icons.close className='size-3.5' />
                      </Button>
                    ) : null}
                  </div>
                </SortableItem>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {!disabled ? (
        <div className='flex items-center gap-2'>
          <Input
            ref={newItemRef}
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e)}
            placeholder={`${addLabel}…`}
            className='h-10 flex-1 rounded-xl border-dashed'
          />
          <Button
            type='button'
            variant='outline'
            className='h-10 shrink-0 rounded-xl px-3 font-medium'
            onClick={handleAdd}
            disabled={!newItem.trim()}
          >
            <Icons.add className='size-4' />
            {addLabel}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
