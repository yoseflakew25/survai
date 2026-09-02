'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';

interface SortableItemProps {
  id: string;
  index: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
}

export function SortableItem({
  id,
  index,
  children,
  className,
  disabled = false
}: SortableItemProps) {
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
        'flex items-center gap-2',
        isDragging && 'opacity-50 rounded-lg bg-primary/10 shadow-lg',
        className
      )}
    >
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
          aria-label={`Drag to reorder item ${index + 1}`}
        >
          <Icons.gripVertical className='h-4 w-4' />
        </button>
      )}
      {disabled && <div className='w-6 shrink-0' />}
      {children}
    </div>
  );
}
