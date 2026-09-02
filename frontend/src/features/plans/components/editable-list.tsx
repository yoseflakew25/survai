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
  placeholder = 'Enter item...',
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
      activationConstraint: {
        distance: 8 // 8px movement before drag starts
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
        const oldIndex = items.findIndex((_, i) => `item-${i}` === active.id);
        const newIndex = items.findIndex((_, i) => `item-${i}` === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          onChange(arrayMove(items, oldIndex, newIndex));
        }
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
          if (index === items.length - 1) {
            newItemRef.current?.focus();
          }
        } else {
          handleAdd();
        }
      } else if (e.key === 'Escape') {
        setEditingIndex(null);
      } else if (e.key === 'Backspace' && index !== undefined && items[index] === '') {
        e.preventDefault();
        handleRemove(index);
        if (index > 0) {
          setEditingIndex(index - 1);
        }
      }
    },
    [handleAdd, handleRemove, items]
  );

  const handleFocus = useCallback((index: number) => {
    setEditingIndex(index);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => setEditingIndex(null), 150);
  }, []);

  return (
    <div className={cn('space-y-2', className)}>
      {items.length === 0 && (
        <div className='flex flex-col items-center justify-center rounded-lg border border-dashed py-8 text-center bg-primary/5 text-primary-foreground/80'>
          <Icons.forms className='text-muted-foreground/40 mb-2 h-8 w-8' />
          <p className='text-muted-foreground text-sm'>{emptyMessage}</p>
          <p className='text-muted-foreground/60 mt-1 text-xs'>
            Click the button below or use AI to generate
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((_, i) => `item-${i}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className='space-y-1.5'>
            {items.map((item, index) => (
              <SortableItem
                key={`item-${index}`}
                id={`item-${index}`}
                index={index}
                disabled={disabled}
              >
                <div
                  className={cn(
                    'group flex flex-1 items-center gap-2 rounded-md px-2 py-1 transition-colors',
                    editingIndex === index
                      ? 'bg-primary/5 ring-1 ring-primary/20'
                      : 'hover:bg-muted/50'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded text-xs font-medium transition-colors',
                      editingIndex === index
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {index + 1}
                  </span>
                  <Input
                    value={item}
                    onChange={(e) => handleUpdate(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    onFocus={() => handleFocus(index)}
                    onBlur={handleBlur}
                    placeholder={placeholder}
                    disabled={disabled}
                    className={cn(
                      'h-8 flex-1 border-transparent bg-transparent font-medium focus:border-primary focus:bg-background',
                      !item && 'text-muted-foreground italic'
                    )}
                  />
                  {!disabled && (
                    <div className='flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100'>
                      <Button
                        variant='ghost'
                        size='icon-sm'
                        onClick={() => handleRemove(index)}
                        className='h-6 w-6 text-muted-foreground hover:text-destructive'
                        aria-label={`Remove item ${index + 1}`}
                      >
                        <Icons.close className='h-3.5 w-3.5' />
                      </Button>
                    </div>
                  )}
                </div>
              </SortableItem>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {!disabled && (
        <div className='flex items-center gap-2'>
          <div className='relative flex-1'>
            <Input
              ref={newItemRef}
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e)}
              placeholder={addLabel + '...'}
              className='h-9 border-dashed'
            />
          </div>
          <Button
            variant='outline'
            size='default'
            onClick={handleAdd}
            disabled={!newItem.trim()}
          >
            <Icons.add className='mr-1 h-4 w-4' />
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
