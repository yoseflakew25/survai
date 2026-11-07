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
import { cn } from '@/lib/utils';
import type {
  ConditionalLogic,
  ConditionalRule,
  Question,
  QuestionType,
  QuestionOption
} from '../api/types';
import { QUESTION_TYPES, getQuestionTypeMeta } from '../api/types';
import { PendingConditionalBanner } from './pending-conditional-banner';

type SkipOp = ConditionalRule['op'];

type DraftSkipRule = {
  questionId: string;
  op: SkipOp;
  value: string;
};

function emptySkipRule(questionId = ''): DraftSkipRule {
  return { questionId, op: 'eq', value: '' };
}

function normalizeOp(op: string | undefined): SkipOp {
  if (op === 'neq' || op === 'gt' || op === 'lt' || op === 'contains') {
    return op;
  }
  return 'eq';
}

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
  onClearConditionalLogic?: () => Promise<void> | void;
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
  onDraftPendingLogic,
  onClearConditionalLogic
}: QuestionEditorProps) {
  const [promptText, setPromptText] = useState(question?.promptText ?? '');
  const [helpText, setHelpText] = useState(question?.helpText ?? '');
  const [isRequired, setIsRequired] = useState(question?.isRequired ?? false);
  const [type, setType] = useState<QuestionType>(question?.type ?? 'short_text');
  const [options, setOptions] = useState<QuestionOption[]>(
    question?.options ?? []
  );
  const [busyLogic, setBusyLogic] = useState(false);
  const priorQuestions = siblingQuestions.filter((q) => q.id !== question?.id);
  const [logicOperator, setLogicOperator] = useState<'AND' | 'OR'>('AND');
  const [draftRules, setDraftRules] = useState<DraftSkipRule[]>(() => [
    emptySkipRule(priorQuestions[0]?.id ?? '')
  ]);

  useEffect(() => {
    if (!question) return;
    setPromptText(question.promptText);
    setHelpText(question.helpText ?? '');
    setIsRequired(question.isRequired);
    setType(question.type);
    setOptions(question.options ?? []);
    const priors = siblingQuestions.filter((q) => q.id !== question.id);
    const source =
      question.pendingConditionalLogic ?? question.conditionalLogic;
    if (source?.rules?.length) {
      setLogicOperator(source.operator === 'OR' ? 'OR' : 'AND');
      setDraftRules(
        source.rules.map((r) => ({
          questionId: r.questionId || priors[0]?.id || '',
          op: normalizeOp(r.op),
          value:
            r.value !== undefined && r.value !== null ? String(r.value) : ''
        }))
      );
    } else {
      setLogicOperator('AND');
      setDraftRules([emptySkipRule(priors[0]?.id ?? '')]);
    }
  }, [question, siblingQuestions]);

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

  function handleDraftFromEditor() {
    if (!onDraftPendingLogic) return;
    const rules = draftRules
      .map((r) => {
        const valueRaw = r.value.trim();
        if (!r.questionId || !valueRaw) return null;
        const numeric =
          r.op === 'gt' || r.op === 'lt' ? Number(valueRaw) : valueRaw;
        return {
          questionId: r.questionId,
          op: r.op,
          value:
            typeof numeric === 'number' && Number.isFinite(numeric)
              ? numeric
              : valueRaw
        };
      })
      .filter((r): r is NonNullable<typeof r> => r != null);
    if (rules.length === 0) return;
    onDraftPendingLogic({
      operator: logicOperator,
      rules
    });
  }

  const canDraftLogic = draftRules.some(
    (r) => r.questionId && r.value.trim()
  );

  async function handleConfirmPending() {
    if (!pending || !onConfirmPendingLogic) return;
    setBusyLogic(true);
    try {
      await onConfirmPendingLogic(pending);
    } finally {
      setBusyLogic(false);
    }
  }

  async function handleClearLogic() {
    if (!onClearConditionalLogic) return;
    setBusyLogic(true);
    try {
      await onClearConditionalLogic();
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

          {priorQuestions.length > 0 && onDraftPendingLogic ? (
            <div className='space-y-3 rounded-xl border border-border p-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold'>Skip logic</p>
                  <p className='text-muted-foreground text-[11px]'>
                    Show this question when the rules match. Draft, then confirm.
                  </p>
                </div>
                <div className='flex shrink-0 rounded-lg border border-border p-0.5'>
                  {(['AND', 'OR'] as const).map((op) => (
                    <button
                      key={op}
                      type='button'
                      className={cn(
                        'rounded-md px-2 py-1 text-[10px] font-semibold transition-colors',
                        logicOperator === op
                          ? 'bg-brand-soft text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setLogicOperator(op)}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              <div className='space-y-2'>
                {draftRules.map((rule, index) => {
                  const selectedPrior = priorQuestions.find(
                    (q) => q.id === rule.questionId
                  );
                  const priorChoices = selectedPrior?.options ?? [];
                  return (
                    <div
                      key={`skip-rule-${index}`}
                      className='space-y-2 rounded-lg border border-border/80 bg-muted/20 p-2.5'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <p className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
                          Rule {index + 1}
                          {index > 0 ? ` · ${logicOperator}` : ''}
                        </p>
                        {draftRules.length > 1 ? (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='text-destructive h-6 px-1.5 text-[10px]'
                            onClick={() =>
                              setDraftRules((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            Remove
                          </Button>
                        ) : null}
                      </div>
                      <select
                        className='border-input bg-background h-9 w-full rounded-md border px-2 text-xs'
                        value={rule.questionId}
                        onChange={(e) => {
                          const questionId = e.target.value;
                          setDraftRules((prev) =>
                            prev.map((r, i) =>
                              i === index
                                ? { ...r, questionId, value: '' }
                                : r
                            )
                          );
                        }}
                      >
                        {priorQuestions.map((q) => (
                          <option key={q.id} value={q.id}>
                            {q.promptText.slice(0, 60) || 'Untitled'}
                          </option>
                        ))}
                      </select>
                      <div className='grid grid-cols-2 gap-2'>
                        <select
                          className='border-input bg-background h-9 rounded-md border px-2 text-xs'
                          value={rule.op}
                          onChange={(e) => {
                            const op = normalizeOp(e.target.value);
                            setDraftRules((prev) =>
                              prev.map((r, i) =>
                                i === index ? { ...r, op } : r
                              )
                            );
                          }}
                        >
                          <option value='eq'>equals</option>
                          <option value='neq'>not equals</option>
                          <option value='gt'>greater than</option>
                          <option value='lt'>less than</option>
                          <option value='contains'>contains</option>
                        </select>
                        {priorChoices.length > 0 &&
                        (rule.op === 'eq' || rule.op === 'neq') ? (
                          <select
                            className='border-input bg-background h-9 rounded-md border px-2 text-xs'
                            value={rule.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDraftRules((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, value } : r
                                )
                              );
                            }}
                          >
                            <option value=''>Select value…</option>
                            {priorChoices.map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <Input
                            className='h-9 text-xs'
                            value={rule.value}
                            onChange={(e) => {
                              const value = e.target.value;
                              setDraftRules((prev) =>
                                prev.map((r, i) =>
                                  i === index ? { ...r, value } : r
                                )
                              );
                            }}
                            placeholder='Value'
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className='flex flex-col gap-2'>
                <Button
                  type='button'
                  variant='ghost'
                  className='h-8 justify-start rounded-xl px-2 text-xs'
                  disabled={draftRules.length >= 6}
                  onClick={() =>
                    setDraftRules((prev) => [
                      ...prev,
                      emptySkipRule(priorQuestions[0]?.id ?? '')
                    ])
                  }
                >
                  <Icons.add className='mr-1 size-3' />
                  Add rule
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full rounded-xl text-xs'
                  disabled={!canDraftLogic || busyLogic}
                  onClick={handleDraftFromEditor}
                >
                  Draft skip logic
                </Button>
              </div>
            </div>
          ) : null}

          {question?.conditionalLogic ? (
            <div className='flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2'>
              <p className='text-muted-foreground text-[11px]'>
                Live skip logic (
                {question.conditionalLogic.rules.length} rule
                {question.conditionalLogic.rules.length === 1 ? '' : 's'}).
              </p>
              {onClearConditionalLogic ? (
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='text-destructive h-7 text-xs'
                  disabled={busyLogic}
                  onClick={() => void handleClearLogic()}
                >
                  Clear
                </Button>
              ) : null}
            </div>
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
