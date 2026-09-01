'use client';

import { useState, useCallback } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Field, FieldLabel } from '@/components/ui/field';
import { Icons } from '@/components/icons';
import type { Question, QuestionType, QuestionOption } from '../api/types';
import { QUESTION_TYPES, getQuestionTypeMeta } from '../api/types';

interface QuestionEditorProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: {
    promptText: string;
    helpText: string | null;
    isRequired: boolean;
    type: QuestionType;
    options: QuestionOption[] | null;
  }) => void;
}

let optionIdCounter = 10000;

export function QuestionEditor({
  question,
  open,
  onOpenChange,
  onSave
}: QuestionEditorProps) {
  const [promptText, setPromptText] = useState(question?.promptText ?? '');
  const [helpText, setHelpText] = useState(question?.helpText ?? '');
  const [isRequired, setIsRequired] = useState(question?.isRequired ?? false);
  const [type, setType] = useState<QuestionType>(question?.type ?? 'short_text');
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options ?? []
  );

  // Sync state when question changes
  const questionId = question?.id;
  useState(() => {
    if (question) {
      setPromptText(question.promptText);
      setHelpText(question.helpText ?? '');
      setIsRequired(question.isRequired);
      setType(question.type);
      setOptions(question.options ?? []);
    }
  });

  const typeMeta = getQuestionTypeMeta(type);
  const hasOptions = typeMeta.hasOptions;

  const handleAddOption = useCallback(() => {
    const newOpt: QuestionOption = {
      id: `opt_${++optionIdCounter}`,
      label: `Option ${options.length + 1}`,
      value: `option_${options.length + 1}`
    };
    setOptions([...options, newOpt]);
  }, [options]);

  const handleUpdateOption = useCallback(
    (index: number, label: string) => {
      const updated = [...options];
      updated[index] = { ...updated[index], label, value: label.toLowerCase().replace(/\s+/g, '_') };
      setOptions(updated);
    },
    [options]
  );

  const handleRemoveOption = useCallback(
    (index: number) => {
      setOptions(options.filter((_, i) => i !== index));
    },
    [options]
  );

  function handleSave() {
    if (!promptText.trim()) return;
    onSave({
      promptText: promptText.trim(),
      helpText: helpText.trim() || null,
      isRequired,
      type,
      options: hasOptions ? options : null
    });
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side='right' className='sm:max-w-md'>
        <SheetHeader>
          <SheetTitle>
            {question ? 'Edit Question' : 'New Question'}
          </SheetTitle>
          <SheetDescription>
            Configure the question text, type, and options
          </SheetDescription>
        </SheetHeader>

        <div className='space-y-4 px-4 pb-4'>
          {/* Question text */}
          <Field>
            <FieldLabel>Question Text *</FieldLabel>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder='Enter your question...'
              rows={3}
              className='resize-none'
            />
          </Field>

          {/* Help text */}
          <Field>
            <FieldLabel>Help Text</FieldLabel>
            <Input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder='Optional guidance for respondents'
            />
          </Field>

          {/* Question type */}
          <Field>
            <FieldLabel>Question Type</FieldLabel>
            <div className='grid grid-cols-2 gap-1.5'>
              {QUESTION_TYPES.map((qt) => {
                const Icon = Icons[qt.icon as keyof typeof Icons] ?? Icons.forms;
                return (
                  <button
                    key={qt.type}
                    onClick={() => {
                      setType(qt.type);
                      if (!qt.hasOptions) setOptions([]);
                    }}
                    className={`flex items-center gap-2 rounded-md border p-2 text-left text-xs transition-colors ${
                      type === qt.type
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className='h-3.5 w-3.5 shrink-0' />
                    <span>{qt.label}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          {/* Required toggle */}
          <div className='flex items-center justify-between'>
            <FieldLabel>Required</FieldLabel>
            <Switch
              checked={isRequired}
              onCheckedChange={setIsRequired}
              
            />
          </div>

          {/* Options editor (for choice types) */}
          {hasOptions && (
            <Field>
              <FieldLabel>Options</FieldLabel>
              <div className='space-y-2'>
                {options.map((opt, i) => (
                  <div key={opt.id} className='flex items-center gap-2'>
                    <span className='text-muted-foreground w-4 text-center text-xs'>
                      {i + 1}
                    </span>
                    <Input
                      value={opt.label}
                      onChange={(e) => handleUpdateOption(i, e.target.value)}
                      className='h-8 flex-1 text-sm'
                    />
                    <Button
                      variant='ghost'
                      size='icon-sm'
                      onClick={() => handleRemoveOption(i)}
                      className='shrink-0'
                    >
                      <Icons.close className='h-3 w-3' />
                    </Button>
                  </div>
                ))}
                <Button
                  variant='outline'
                  
                  onClick={handleAddOption}
                  className='w-full'
                >
                  <Icons.add className='mr-1 h-3 w-3' />
                  Add Option
                </Button>
              </div>
            </Field>
          )}

          {/* Save */}
          <div className='flex items-center gap-2 pt-2'>
            <Button onClick={handleSave} disabled={!promptText.trim()}>
              Save Question
            </Button>
            <Button variant='ghost' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
