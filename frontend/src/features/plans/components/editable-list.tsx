'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

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

  const handleAdd = useCallback(() => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
  }, [newItem, items, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(items.filter((_, i) => i !== index));
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
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAdd();
      }
    },
    [handleAdd]
  );

  return (
    <div className={cn('space-y-2', className)}>
      {items.length === 0 && (
        <p className='text-muted-foreground py-2 text-center text-sm'>
          {emptyMessage}
        </p>
      )}

      {items.map((item, index) => (
        <div key={index} className='group flex items-center gap-2'>
          <span className='text-muted-foreground w-5 shrink-0 text-center text-xs font-medium'>
            {index + 1}
          </span>
          <Input
            value={item}
            onChange={(e) => handleUpdate(index, e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className='h-9 flex-1'
          />
          {!disabled && (
            <Button
              variant='ghost'
              size='icon-sm'
              onClick={() => handleRemove(index)}
              className='opacity-0 group-hover:opacity-100 transition-opacity'
              aria-label={`Remove item ${index + 1}`}
            >
              <Icons.close className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>
      ))}

      {!disabled && (
        <div className='flex items-center gap-2'>
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className='h-9 flex-1'
          />
          <Button
            variant='outline'
            
            onClick={handleAdd}
            disabled={!newItem.trim()}
          >
            <Icons.add className='mr-1 h-3.5 w-3.5' />
            {addLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
