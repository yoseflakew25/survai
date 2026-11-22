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
import { useTranslations } from 'next-intl';

const QUESTION_TYPE_KEY: Record<QuestionType, string> = {
  short_text: 'shortText',
  long_text: 'longText',
  single_choice: 'singleChoice',
  multiple_choice: 'multipleChoice',
  dropdown: 'dropdown',
  rating_scale: 'ratingScale',
  number: 'number',
  date: 'date'
};

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
  const t = useTranslations('builder');
  const tCommon = useTranslations('common');
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
      label: t('optionN', { n: options.length + 1 }),
      value: `option_${options.length + 1}`
    };
    setOptions([...options, newOpt]);
  }, [options, t]);

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
            {question ? t('editQuestion') : t('newQuestion')}
          </SheetTitle>
          <SheetDescription>
            {t('editorDescription')}
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
            <FieldLabel>{t('questionTextLabel')}</FieldLabel>
            <Textarea
              value={promptText}
              onChange={(e) => setPromptText(e.target.value)}
              placeholder={t('questionTextPlaceholder')}
              rows={3}
              className='resize-none'
            />
          </Field>

          <Field>
            <FieldLabel>{t('helpTextLabel')}</FieldLabel>
            <Input
              value={helpText}
              onChange={(e) => setHelpText(e.target.value)}
              placeholder={t('helpGuidancePlaceholder')}
            />
          </Field>

          <Field>
            <FieldLabel>{t('questionType')}</FieldLabel>
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
                    <span>{t(QUESTION_TYPE_KEY[qt.type])}</span>
                  </button>
                );
              })}
            </div>
          </Field>

          <div className='flex items-center justify-between'>
            <FieldLabel>{t('required')}</FieldLabel>
            <Switch checked={isRequired} onCheckedChange={setIsRequired} />
          </div>

          {hasOptions && (
            <Field>
              <FieldLabel>{t('options')}</FieldLabel>
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
                  {t('addOption')}
                </Button>
              </div>
            </Field>
          )}

          {priorQuestions.length > 0 && onDraftPendingLogic ? (
            <div className='space-y-3 rounded-xl border border-border p-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='min-w-0'>
                  <p className='text-xs font-semibold'>{t('skipLogic')}</p>
                  <p className='text-muted-foreground text-[11px]'>
                    {t('skipLogicHint')}
                  </p>
                </div>
                <div className='flex shrink-0 rounded-lg border border-border p-0.5'>
                  {(['AND', 'OR'] as const).map((op) => (
                    <button
                      key={op}
                      type='button'
                      className={cn(
                        'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                        logicOperator === op
                          ? 'bg-brand-soft text-foreground'
                          : 'text-muted-foreground hover:text-foreground'
                      )}
                      onClick={() => setLogicOperator(op)}
                    >
                      {op === 'AND' ? t('and') : t('or')}
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
                        <p className='text-muted-foreground text-xs font-semibold tracking-wide uppercase'>
                          {index > 0
                            ? t('ruleWithOp', {
                                index: index + 1,
                                operator:
                                  logicOperator === 'AND' ? t('and') : t('or')
                              })
                            : t('rule', { index: index + 1 })}
                        </p>
                        {draftRules.length > 1 ? (
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='text-destructive h-6 px-1.5 text-xs'
                            onClick={() =>
                              setDraftRules((prev) =>
                                prev.filter((_, i) => i !== index)
                              )
                            }
                          >
                            {tCommon('remove')}
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
                            {q.promptText.slice(0, 60) || tCommon('untitled')}
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
                          <option value='eq'>{t('opEquals')}</option>
                          <option value='neq'>{t('opNotEquals')}</option>
                          <option value='gt'>{t('opGreaterThan')}</option>
                          <option value='lt'>{t('opLessThan')}</option>
                          <option value='contains'>{t('opContains')}</option>
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
                            <option value=''>{t('selectValue')}</option>
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
                            placeholder={t('valuePlaceholder')}
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
                  {t('addRule')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  className='w-full rounded-xl text-xs'
                  disabled={!canDraftLogic || busyLogic}
                  onClick={handleDraftFromEditor}
                >
                  {t('draftSkipLogic')}
                </Button>
              </div>
            </div>
          ) : null}

          {question?.conditionalLogic ? (
            <div className='flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2'>
              <p className='text-muted-foreground text-[11px]'>
                {t('liveSkipLogic', {
                  count: question.conditionalLogic.rules.length
                })}
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
                  {tCommon('clear')}
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className='flex items-center gap-2 pt-2'>
            <Button onClick={handleSave} disabled={!promptText.trim()}>
              {t('saveQuestion')}
            </Button>
            <Button variant='ghost' onClick={() => onOpenChange(false)}>
              {tCommon('cancel')}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
