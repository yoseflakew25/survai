'use client';

import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { QUESTION_TYPES, type QuestionType } from '../api/types';

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType, promptText: string) => void;
  disabled?: boolean;
}

export function QuestionTypeSelector({
  onSelect,
  disabled = false
}: QuestionTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<QuestionType | null>(null);
  const [promptText, setPromptText] = useState('');

  function handleSelect(type: QuestionType) {
    setSelectedType(type);
  }

  function handleConfirm() {
    if (!selectedType || !promptText.trim()) return;
    onSelect(selectedType, promptText.trim());
    setSelectedType(null);
    setPromptText('');
    setOpen(false);
  }

  function handleClose() {
    setSelectedType(null);
    setPromptText('');
    setOpen(false);
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={<div />}>
        <Button variant='outline'  disabled={disabled}>
          <Icons.add className='mr-1 h-3.5 w-3.5' />
          Add Question
        </Button>
      </SheetTrigger>
      <SheetContent side='bottom' className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>Add Question</SheetTitle>
          <SheetDescription>
            Choose a question type and enter the question text
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4 pb-4'>
          {/* Question text */}
          <Input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder='Enter your question...'
            className='text-sm'
          />

          {/* Type grid */}
          <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
            {QUESTION_TYPES.map((qt) => {
              const Icon = Icons[qt.icon as keyof typeof Icons] ?? Icons.forms;
              return (
                <button
                  key={qt.type}
                  onClick={() => handleSelect(qt.type)}
                  className={cn(
                    'flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-colors',
                    selectedType === qt.type
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'hover:bg-muted'
                  )}
                >
                  <Icon className='h-5 w-5' />
                  <span className='text-xs font-medium'>{qt.label}</span>
                </button>
              );
            })}
          </div>

          {/* Confirm */}
          <div className='flex items-center gap-2'>
            <Button
              onClick={handleConfirm}
              disabled={!selectedType || !promptText.trim()}
              
            >
              Add Question
            </Button>
            <Button variant='ghost'  onClick={handleClose}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
