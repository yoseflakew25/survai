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
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-stretch',
        isDragging &&
          'relative z-50 rounded-xl bg-card opacity-95 shadow-md ring-1 ring-border',
        className
      )}
    >
      {!disabled ? (
        <button
          type='button'
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-muted/60 flex w-8 shrink-0 cursor-grab items-center justify-center transition-colors active:cursor-grabbing',
            'focus-visible:ring-ring/40 focus-visible:outline-none focus-visible:ring-2'
          )}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder item ${index + 1}`}
        >
          <Icons.gripVertical className='size-4' />
        </button>
      ) : (
        <div className='w-8 shrink-0' />
      )}
      {children}
    </li>
  );
}
