'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
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

const TYPE_LABEL_KEY: Record<
  QuestionType,
  | 'shortText'
  | 'longText'
  | 'singleChoice'
  | 'multipleChoice'
  | 'dropdown'
  | 'ratingScale'
  | 'number'
  | 'date'
> = {
  short_text: 'shortText',
  long_text: 'longText',
  single_choice: 'singleChoice',
  multiple_choice: 'multipleChoice',
  dropdown: 'dropdown',
  rating_scale: 'ratingScale',
  number: 'number',
  date: 'date'
};

interface QuestionTypeSelectorProps {
  onSelect: (type: QuestionType, promptText: string) => void;
  disabled?: boolean;
}

export function QuestionTypeSelector({ onSelect, disabled = false }: QuestionTypeSelectorProps) {
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
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
        <Button variant='outline' disabled={disabled}>
          <Icons.add className='mr-1 h-3.5 w-3.5' />
          {t('addQuestion')}
        </Button>
      </SheetTrigger>
      <SheetContent side='bottom' className='sm:max-w-lg'>
        <SheetHeader>
          <SheetTitle>{t('addQuestion')}</SheetTitle>
          <SheetDescription>{t('chooseTypeHint')}</SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4 pb-4'>
          {/* Question text */}
          <Input
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            placeholder={t('questionTextPlaceholder')}
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
                  <span className='text-xs font-medium'>{t(TYPE_LABEL_KEY[qt.type])}</span>
                </button>
              );
            })}
          </div>

          {/* Confirm */}
          <div className='flex items-center gap-2'>
            <Button onClick={handleConfirm} disabled={!selectedType || !promptText.trim()}>
              {t('addQuestion')}
            </Button>
            <Button variant='ghost' onClick={handleClose}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
