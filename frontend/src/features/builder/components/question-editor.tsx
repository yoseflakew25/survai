'use client';

import { useState, useCallback, useEffect } from 'react';
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
import type {
  ConditionalLogic,
  Question,
  QuestionType,
  QuestionOption
} from '../api/types';
import { QUESTION_TYPES, getQuestionTypeMeta } from '../api/types';
import { PendingConditionalBanner } from './pending-conditional-banner';

interface QuestionEditorProps {
  question: Question | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siblingQuestions?: Question[];
  onSave: (data: {
    promptText: string;
    helpText: string | null;
    isRequired: boolean;
    type: QuestionType;
    options: QuestionOption[] | null;
  }) => void;
  onConfirmPendingLogic?: (logic: ConditionalLogic) => Promise<void> | void;
  onDismissPendingLogic?: () => void;
  onDraftPendingLogic?: (logic: ConditionalLogic) => void;
}

let optionIdCounter = 10000;

export function QuestionEditor({
  question,
  open,
  onOpenChange,
  siblingQuestions = [],
  onSave,
  onConfirmPendingLogic,
  onDismissPendingLogic,
  onDraftPendingLogic
}: QuestionEditorProps) {
  const [promptText, setPromptText] = useState(question?.promptText ?? '');
  const [helpText, setHelpText] = useState(question?.helpText ?? '');
  const [isRequired, setIsRequired] = useState(question?.isRequired ?? false);
  const [type, setType] = useState<QuestionType>(question?.type ?? 'short_text');
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options ?? []
  );
  const [busyLogic, setBusyLogic] = useState(false);

  useEffect(() => {
    if (!question) return;
    setPromptText(question.promptText);
    setHelpText(question.helpText ?? '');
    setIsRequired(question.isRequired);
    setType(question.type);
    setOptions(question.options ?? []);
  }, [question]);

  const typeMeta = getQuestionTypeMeta(type);
  const hasOptions = typeMeta.hasOptions;
  const pending = question?.pendingConditionalLogic ?? null;

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
      updated[index] = {
        ...updated[index],
        label,
        value: label.toLowerCase().replace(/\s+/g, '_')
      };
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

  function handleSuggestLogic() {
    const prior = siblingQuestions.find((q) => q.id !== question?.id);
    if (!prior || !onDraftPendingLogic) return;
    const firstOpt = prior.options?.[0]?.value ?? 'yes';
    onDraftPendingLogic({
      operator: 'AND',
      rules: [{ questionId: prior.id, op: 'eq', value: firstOpt }]
    });
  }

  async function handleConfirmPending() {
    if (!pending || !onConfirmPendingLogic) return;
    setBusyLogic(true);
    try {
      await onConfirmPendingLogic(pending);
    } finally {
      setBusyLogic(false);
    }
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
          {pending ? (
            <PendingConditionalBanner
              logic={pending}
              busy={busyLogic}
              onConfirm={() => void handleConfirmPending()}
              onDismiss={() => onDismissPendingLogic?.()}
            />
          ) : null}

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

          <Field>
            <FieldLabel>Help Text</FieldLabel>
            <Input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder='Optional guidance for respondents'
            />
          </Field>

          <Field>
            <FieldLabel>Question Type</FieldLabel>
            <div className='grid grid-cols-2 gap-1.5'>
              {QUESTION_TYPES.map((qt) => {
                const Icon = Icons[qt.icon as keyof typeof Icons] ?? Icons.forms;
                return (
                  <button
                    key={qt.type}
                    type='button'
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

          <div className='flex items-center justify-between'>
            <FieldLabel>Required</FieldLabel>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

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

          {!pending && siblingQuestions.length > 0 && onDraftPendingLogic ? (
            <Button
              type='button'
              variant='outline'
              className='w-full rounded-xl text-xs'
              onClick={handleSuggestLogic}
            >
              <Icons.sparkles className='mr-1.5 size-3.5' />
              Draft skip logic (confirm before save)
            </Button>
          ) : null}

          {question?.conditionalLogic ? (
            <p className='text-muted-foreground text-[11px]'>
              Live conditional logic is set (
              {question.conditionalLogic.rules.length} rule
              {question.conditionalLogic.rules.length === 1 ? '' : 's'}).
            </p>
          ) : null}

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
