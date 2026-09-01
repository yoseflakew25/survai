'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import type { ProposedSection } from '../api/types';

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

  const handleAdd = useCallback(() => {
    const trimmedTitle = newTitle.trim();
    const trimmedRationale = newRationale.trim();
    if (!trimmedTitle) return;

    onChange([
      ...sections,
      { title: trimmedTitle, rationale: trimmedRationale }
    ]);
    setNewTitle('');
    setNewRationale('');
  }, [newTitle, newRationale, sections, onChange]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(sections.filter((_, i) => i !== index));
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
      {sections.length === 0 && (
        <p className='text-muted-foreground py-2 text-center text-sm'>
          No sections yet. Generate with AI or add manually.
        </p>
      )}

      {sections.map((section, index) => (
        <div
          key={index}
          className='group rounded-lg border p-3 space-y-2'
        >
          <div className='flex items-center gap-2'>
            <span className='text-muted-foreground w-5 shrink-0 text-center text-xs font-medium'>
              {index + 1}
            </span>
            <Input
              value={section.title}
              onChange={(e) => handleUpdate(index, 'title', e.target.value)}
              placeholder='Section title'
              disabled={disabled}
              className='h-8 flex-1 font-medium'
            />
            {!disabled && (
              <Button
                variant='ghost'
                size='icon-sm'
                onClick={() => handleRemove(index)}
                className='opacity-0 group-hover:opacity-100 transition-opacity'
                aria-label={`Remove section ${index + 1}`}
              >
                <Icons.close className='h-3.5 w-3.5' />
              </Button>
            )}
          </div>
          <Textarea
            value={section.rationale}
            onChange={(e) => handleUpdate(index, 'rationale', e.target.value)}
            placeholder='Why does this section exist? What does it help measure?'
            disabled={disabled}
            rows={2}
            className='resize-none text-xs'
          />
        </div>
      ))}

      {!disabled && (
        <div className='space-y-2 rounded-lg border border-dashed p-3'>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder='Section title'
            className='h-8 font-medium'
          />
          <Textarea
            value={newRationale}
            onChange={(e) => setNewRationale(e.target.value)}
            placeholder='Rationale — why this section matters'
            rows={2}
            className='resize-none text-xs'
          />
          <Button
            variant='outline'
            
            onClick={handleAdd}
            disabled={!newTitle.trim()}
          >
            <Icons.add className='mr-1 h-3.5 w-3.5' />
            Add Section
          </Button>
        </div>
      )}
    </div>
  );
}
