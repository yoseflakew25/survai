'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode
} from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Icons } from '@/components/icons';
import { cn } from '@/lib/utils';
import { createPlanWithAI } from '@/features/plans/api/service';
import { PlanGenerationProgress } from '@/features/plans/components/plan-generation-progress';
import { toast } from '@/lib/toast';

interface NewSurveyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FieldKey = 'title' | 'description' | 'researchGoal';

type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  label?: string;
};

type Answers = {
  title: string;
  description: string;
  researchGoal: string;
};

type Question = {
  field: FieldKey;
  label: string;
  prompt: string;
  placeholder: string;
  multiline?: boolean;
  min: number;
  max: number;
};

const QUESTIONS: Question[] = [
  {
    field: 'title',
    label: 'Title',
    prompt:
      'What should we call this survey? Pick a name your team will recognize at a glance.',
    placeholder: 'e.g. Community Health Assessment 2026',
    min: 3,
    max: 200
  },
  {
    field: 'description',
    label: 'Description',
    prompt:
      'Describe this survey — who it’s for, and what it’s about.',
    placeholder: 'Briefly describe the survey…',
    multiline: true,
    min: 3,
    max: 500
  },
  {
    field: 'researchGoal',
    label: 'Research goal',
    prompt:
      'What do you want to learn? I’ll use this to shape objectives, sections, and questions.',
    placeholder:
      'e.g. Assess healthcare access in DICDO communities to inform program design…',
    multiline: true,
    min: 10,
    max: 2000
  }
];

const EMPTY_ANSWERS: Answers = {
  title: '',
  description: '',
  researchGoal: ''
};

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function validate(question: Question, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return 'This one needs an answer.';
  if (trimmed.length < question.min) {
    return `Need at least ${question.min} characters.`;
  }
  if (trimmed.length > question.max) {
    return `Keep it under ${question.max} characters.`;
  }
  return null;
}

function replyDelay(text: string) {
  return Math.min(1400, Math.max(550, 420 + text.length * 12));
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function NewSurveyDialog({ open, onOpenChange }: NewSurveyDialogProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [composerReady, setComposerReady] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const runIdRef = useRef(0);

  const currentQuestion = done || !composerReady ? null : QUESTIONS[questionIndex];
  const inputLocked = isTyping || !composerReady || done;

  const pushAssistant = useCallback(async (msg: Omit<ChatMessage, 'id' | 'role'>) => {
    setIsTyping(true);
    await wait(replyDelay(msg.content));
    setMessages((prev) => [
      ...prev,
      { id: uid(), role: 'assistant', ...msg }
    ]);
    setIsTyping(false);
  }, []);

  const resetChat = useCallback(() => {
    const runId = ++runIdRef.current;
    setMessages([]);
    setQuestionIndex(0);
    setAnswers(EMPTY_ANSWERS);
    setDraft('');
    setError(null);
    setDone(false);
    setIsTyping(false);
    setComposerReady(false);
    setIsGeneratingPlan(false);

    void (async () => {
      const first = QUESTIONS[0];
      const intro =
        "Let's set up a new survey. I'll ask a few things, then we can generate the plan together.";

      setIsTyping(true);
      await wait(650);
      if (runId !== runIdRef.current) return;
      setMessages([
        { id: uid(), role: 'assistant', content: intro }
      ]);
      setIsTyping(false);

      await wait(380);
      if (runId !== runIdRef.current) return;
      setIsTyping(true);
      await wait(replyDelay(first.prompt));
      if (runId !== runIdRef.current) return;
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: 'assistant',
          label: first.label,
          content: first.prompt
        }
      ]);
      setIsTyping(false);
      setComposerReady(true);
    })();
  }, []);

  useEffect(() => {
    if (open) resetChat();
    return () => {
      runIdRef.current += 1;
    };
  }, [open, resetChat]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [messages, error, done, isTyping, isGeneratingPlan]);

  useEffect(() => {
    if (!open || done || isTyping || !composerReady) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [open, questionIndex, done, isTyping, composerReady]);

  const handleClose = useCallback(() => {
    if (isGeneratingPlan) return;
    runIdRef.current += 1;
    onOpenChange(false);
  }, [isGeneratingPlan, onOpenChange]);

  const handleGeneratePlan = useCallback(async () => {
    if (isGeneratingPlan) return;
    setIsGeneratingPlan(true);
    try {
      const researchGoal = [
        `Survey title: ${answers.title.trim()}`,
        answers.description.trim()
          ? `Description: ${answers.description.trim()}`
          : null,
        answers.researchGoal.trim()
      ]
        .filter(Boolean)
        .join('\n\n');

      const plan = await createPlanWithAI({ researchGoal });

      toast.success('Plan generated', {
        description: 'Review and refine your survey plan next.'
      });

      runIdRef.current += 1;
      onOpenChange(false);
      router.push(`/dashboard/plans/${plan.id}`);
    } catch (err) {
      toast.error('Could not generate plan', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
    } finally {
      setIsGeneratingPlan(false);
    }
  }, [answers, isGeneratingPlan, onOpenChange, router]);

  const advance = useCallback(
    async (value: string) => {
      if (!currentQuestion || isTyping) return;

      const trimmed = value.trim();
      const nextAnswers = {
        ...answers,
        [currentQuestion.field]: trimmed
      };
      const runId = ++runIdRef.current;
      const nextIndex = questionIndex + 1;

      setAnswers(nextAnswers);
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'user', content: trimmed }
      ]);
      setDraft('');
      setError(null);
      setComposerReady(false);

      if (nextIndex >= QUESTIONS.length) {
        await pushAssistant({
          content:
            "Got it. Here's what we have — when you're ready, we can generate the survey plan."
        });
        if (runId !== runIdRef.current) return;
        setDone(true);
        return;
      }

      const nextQ = QUESTIONS[nextIndex];
      await pushAssistant({
        label: nextQ.label,
        content: nextQ.prompt
      });
      if (runId !== runIdRef.current) return;
      setQuestionIndex(nextIndex);
      setComposerReady(true);
    },
    [answers, currentQuestion, isTyping, pushAssistant, questionIndex]
  );

  const handleSubmit = useCallback(
    (e?: FormEvent) => {
      e?.preventDefault();
      if (!currentQuestion || inputLocked) return;

      const issue = validate(currentQuestion, draft);
      if (issue) {
        setError(issue);
        return;
      }
      void advance(draft);
    },
    [advance, currentQuestion, draft, inputLocked]
  );

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter') return;
    if (e.shiftKey) return;
    e.preventDefault();
    handleSubmit();
  };

  const charCount = draft.length;
  const maxChars = currentQuestion?.max ?? 0;

  const activeStep = done ? QUESTIONS.length : questionIndex + 1;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) handleClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent
        showCloseButton
        className='flex h-[min(820px,92svh)] w-full flex-col gap-0 overflow-hidden rounded-2xl border-border p-0 sm:max-w-2xl'
      >
        <DialogHeader className='shrink-0 border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-6 py-5 text-foreground sm:px-8'>
          <div className='flex flex-col gap-4 pr-10 sm:flex-row sm:items-end sm:justify-between sm:gap-8'>
            <div className='min-w-0 space-y-1'>
              <DialogTitle className='font-display text-[1.85rem] leading-[1.05] font-extrabold tracking-[-0.035em] text-foreground '>
                New survey
              </DialogTitle>
              <DialogDescription className='text-foreground/70 max-w-xs text-sm leading-relaxed'>
                Three short questions. Answer in the chat below.
              </DialogDescription>
            </div>

            <ol
              className='flex shrink-0 items-center gap-1.5 self-start sm:self-end'
              aria-label='Progress'
            >
              {QUESTIONS.map((q, i) => {
                const n = i + 1;
                const complete = activeStep > n;
                const current = !done && activeStep === n;
                return (
                  <li key={q.field} className='flex items-center gap-1.5'>
                    <span
                      className={cn(
                        'flex size-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                        complete && 'bg-foreground text-brand',
                        current &&
                          'bg-card text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_20%,transparent)]',
                        !complete &&
                          !current &&
                          'bg-foreground/10 text-foreground/55'
                      )}
                    >
                      {complete ? (
                        <Icons.check className='size-3.5' stroke={2.5} />
                      ) : (
                        n
                      )}
                    </span>
                    {i < QUESTIONS.length - 1 ? (
                      <span
                        className={cn(
                          'block h-px w-5 sm:w-7',
                          complete ? 'bg-foreground/50' : 'bg-foreground/20'
                        )}
                        aria-hidden
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </div>
        </DialogHeader>

        <div
          ref={listRef}
          className='relative min-h-0 flex-1 overflow-y-auto'
          style={{
            backgroundImage: `
              radial-gradient(ellipse 80% 50% at 50% 0%, color-mix(in srgb, var(--brand) 14%, transparent), transparent 70%),
              radial-gradient(color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)
            `,
            backgroundSize: 'auto, 18px 18px'
          }}
        >
          <div className='space-y-4 px-6 py-6 sm:px-8'>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' ? (
                  <AssistantAvatar />
                ) : null}
                <div
                  className={cn(
                    'max-w-[min(100%,34rem)] rounded-2xl px-4 py-3 text-[0.9375rem] leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-foreground text-background rounded-br-md'
                      : 'border-border bg-card/95 text-foreground rounded-bl-md border shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                  )}
                >
                  {msg.role === 'assistant' && msg.label ? (
                    <p className='text-brand-strong mb-1.5 text-[11px] font-semibold tracking-wide uppercase'>
                      {msg.label}
                    </p>
                  ) : null}
                  {msg.content}
                </div>
              </div>
            ))}

            {isTyping ? <TypingIndicator /> : null}

            {done && isGeneratingPlan ? (
              <div className='border-border bg-card mt-1 overflow-hidden rounded-2xl border shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
                <div className='flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand px-4 py-3'>
                  <div className='min-w-0'>
                    <p className='font-display text-base font-extrabold tracking-tight text-foreground'>
                      Generating Survey plan
                    </p>
                    <p className='text-foreground/70 text-xs'>
                      Drafting from your research goal
                    </p>
                  </div>
                  <Icons.spinner className='size-4 shrink-0 animate-spin text-foreground' />
                </div>
                <div className='px-4 py-4'>
                  <PlanGenerationProgress
                    active={isGeneratingPlan}
                    goalPreview={answers.researchGoal}
                  />
                </div>
              </div>
            ) : null}

            {done && !isGeneratingPlan ? (
              <div className='border-border bg-card mt-1 overflow-hidden rounded-2xl border shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
                <div className='flex items-center justify-between gap-3 border-b border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand px-4 py-3'>
                  <div className='min-w-0'>
                    <p className='font-display text-base font-extrabold tracking-tight text-foreground'>
                      Ready to generate
                    </p>
                    <p className='text-foreground/70 text-xs'>
                      Review your answers below
                    </p>
                  </div>
                  <span className='bg-card text-foreground inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm'>
                    <Icons.check className='size-3.5' stroke={2.5} />
                    3/3
                  </span>
                </div>

                <div className='divide-border divide-y'>
                  <SummaryRow
                    icon={<Icons.page className='size-4' />}
                    label='Title'
                    value={answers.title}
                  />
                  <SummaryRow
                    icon={<Icons.text className='size-4' />}
                    label='Description'
                    value={answers.description}
                  />
                  <SummaryRow
                    icon={<Icons.sparkles className='size-4' />}
                    label='Research goal'
                    value={answers.researchGoal}
                  />
                </div>

                <div className='bg-brand-soft/60 border-border border-t px-4 py-3'>
                  <p className='text-muted-foreground text-xs leading-relaxed'>
                    Next we&apos;ll carefully draft objectives, research
                    questions, audiences, and survey sections from your goal.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className='border-border shrink-0 border-t bg-[color-mix(in_srgb,var(--background)_55%,var(--brand-soft))] px-6 py-4 sm:px-8'>
          {done && isGeneratingPlan ? (
            <p className='text-muted-foreground text-center text-xs'>
              Generating with Gemini — please don&apos;t close this dialog.
            </p>
          ) : done ? (
            <div className='flex items-center justify-between gap-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={handleClose}
                disabled={isGeneratingPlan}
              >
                Close
              </Button>
              <Button
                type='button'
                disabled={isGeneratingPlan}
                onClick={() => void handleGeneratePlan()}
                className='h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-5 font-semibold text-foreground disabled:opacity-70'
              >
                <Icons.sparkles className='size-4' />
                Generate plan
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className='space-y-2.5'>
              {currentQuestion ? (
                <div className='flex items-center gap-2'>
                  <span className='inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-foreground'>
                    <span className='bg-foreground/80 size-1.5 rounded-full' />
                    {currentQuestion.label}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {questionIndex + 1}/{QUESTIONS.length}
                  </span>
                </div>
              ) : null}
              <div className='relative'>
                <Textarea
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => {
                    setDraft(e.target.value);
                    if (error) setError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    inputLocked
                      ? isTyping
                        ? 'SurvAI is typing…'
                        : 'Getting ready…'
                      : currentQuestion?.placeholder
                  }
                  rows={currentQuestion?.multiline ? 3 : 2}
                  maxLength={maxChars}
                  disabled={inputLocked}
                  className='border-border bg-card max-h-40 min-h-12 resize-none rounded-2xl border-2 pr-14 text-sm shadow-sm focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))] disabled:opacity-70'
                  aria-invalid={!!error}
                />
                <Button
                  type='submit'
                  size='icon'
                  disabled={inputLocked || !draft.trim()}
                  className='absolute right-2.5 bottom-2.5 size-9 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:brightness-105'
                  aria-label='Send'
                >
                  {isTyping ? (
                    <Icons.spinner className='size-4 animate-spin' />
                  ) : (
                    <Icons.send className='size-4' />
                  )}
                </Button>
              </div>
              <div className='flex items-center justify-between gap-2'>
                <div className='min-w-0'>
                  {error ? (
                    <p className='text-destructive text-xs'>{error}</p>
                  ) : (
                    <p className='text-muted-foreground text-xs'>
                      {isTyping
                        ? 'Waiting for the next question…'
                        : 'Enter to send · Shift+Enter for new line'}
                      {!isTyping ? (
                        <span className='text-muted-foreground/70'>
                          {' '}
                          · {charCount}/{maxChars}
                        </span>
                      ) : null}
                    </p>
                  )}
                </div>
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='h-8 shrink-0 text-xs'
                  onClick={handleClose}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AssistantAvatar() {
  return (
    <div
      className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
      aria-hidden
    >
      <Icons.survey className='size-4' />
    </div>
  );
}

function TypingIndicator() {
  return (
    <div
      className='flex gap-3 animate-in fade-in duration-200'
      aria-live='polite'
      aria-label='SurvAI is typing'
    >
      <AssistantAvatar />
      <div className='border-border bg-card/95 flex items-center gap-1.5 rounded-2xl rounded-bl-md border px-4 py-3 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className='bg-foreground/45 size-1.5 animate-bounce rounded-full'
            style={{ animationDelay: `${i * 140}ms`, animationDuration: '900ms' }}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className='flex gap-3 px-4 py-3.5'>
      <div
        className='bg-brand-soft text-foreground mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl'
        aria-hidden
      >
        {icon}
      </div>
      <div className='min-w-0 flex-1 space-y-0.5'>
        <p className='text-muted-foreground text-[11px] font-medium tracking-wide uppercase'>
          {label}
        </p>
        <p className='text-sm leading-snug font-medium whitespace-pre-wrap text-foreground'>
          {value}
        </p>
      </div>
    </div>
  );
}
