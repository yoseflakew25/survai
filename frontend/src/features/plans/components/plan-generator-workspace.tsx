'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SurvaiPanel } from '@/components/survai-panel';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import {
  createPlanWithAI,
  sendPlanInterviewTurnStream
} from '../api/service';
import type {
  PlanInterviewBrief,
  PlanInterviewMessage
} from '../api/types';
import {
  clearInterviewDraft,
  loadInterviewDraft,
  saveInterviewDraft
} from '../lib/interview-draft';
import { PlanGenerationProgress } from './plan-generation-progress';
import { Textarea } from '@/components/ui/textarea';

const STARTERS = [
  'Assess healthcare access in rural DICDO clinics to inform outreach design',
  'Baseline digital literacy among women aged 15–45 in our program areas',
  'Understand household water and sanitation needs before the next funding cycle'
] as const;

const STAGE_LABELS: Record<string, string> = {
  thinking: 'Thinking…',
  answering: 'Writing reply…'
};

const brandCtaClass =
  'h-9 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-3.5 text-sm font-semibold text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[filter,box-shadow] hover:brightness-105 hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_35%,transparent)]';

const EMPTY_BRIEF: PlanInterviewBrief = {
  titleHint: '',
  audiences: [],
  decisions: [],
  constraints: [],
  summary: ''
};

const INTRO =
  "Let's shape a survey plan together. Tell me what you want to learn — audience, decisions, and any constraints help. I'll ask follow-ups, then we can generate the plan.";

type ChatMessage = PlanInterviewMessage & { id: string };

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function briefHasContent(brief: PlanInterviewBrief) {
  return Boolean(
    brief.titleHint.trim() ||
      brief.summary.trim() ||
      brief.audiences.length ||
      brief.decisions.length ||
      brief.constraints.length
  );
}

function introMessages(): ChatMessage[] {
  return [{ id: uid(), role: 'assistant', content: INTRO }];
}

export function PlanGeneratorWorkspace() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(introMessages);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [streamDraft, setStreamDraft] = useState('');
  const [brief, setBrief] = useState<PlanInterviewBrief>(EMPTY_BRIEF);
  const [researchGoalDraft, setResearchGoalDraft] = useState('');
  const [readyToGenerate, setReadyToGenerate] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const userTurnCount = messages.filter((m) => m.role === 'user').length;
  const canForceGenerate =
    userTurnCount >= 1 && researchGoalDraft.trim().length >= 40;
  const generateEnabled =
    !sending &&
    !isGenerating &&
    (readyToGenerate || canForceGenerate) &&
    researchGoalDraft.trim().length >= 10;
  const hasProgress =
    userTurnCount > 0 ||
    briefHasContent(brief) ||
    researchGoalDraft.trim().length > 0;

  useEffect(() => {
    const draft = loadInterviewDraft();
    if (draft?.messages?.length) {
      setMessages(
        draft.messages.map((m) => ({
          id: uid(),
          role: m.role,
          content: m.content
        }))
      );
      setBrief(draft.brief ?? EMPTY_BRIEF);
      setResearchGoalDraft(draft.researchGoalDraft ?? '');
      setReadyToGenerate(Boolean(draft.readyToGenerate));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || sending || isGenerating) return;
    if (!hasProgress) {
      clearInterviewDraft();
      return;
    }
    saveInterviewDraft({
      messages: messages.map(({ role, content }) => ({ role, content })),
      brief,
      researchGoalDraft,
      readyToGenerate
    });
  }, [
    hydrated,
    messages,
    brief,
    researchGoalDraft,
    readyToGenerate,
    sending,
    isGenerating,
    hasProgress
  ]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, streamDraft, streamStage, isGenerating]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (sending || isGenerating) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [sending, isGenerating]);

  const handleStartOver = useCallback(() => {
    if (sending || isGenerating) return;
    clearInterviewDraft();
    setMessages(introMessages());
    setBrief(EMPTY_BRIEF);
    setResearchGoalDraft('');
    setReadyToGenerate(false);
    setInput('');
    setStreamDraft('');
    setStreamStage(null);
    inputRef.current?.focus();
  }, [sending, isGenerating]);

  const handleSend = useCallback(
    async (raw?: string) => {
      const content = (raw ?? input).trim();
      if (!content || sending || isGenerating) return;

      const history: PlanInterviewMessage[] = messages.map(
        ({ role, content: c }) => ({ role, content: c })
      );
      const userMsg: ChatMessage = {
        id: uid(),
        role: 'user',
        content
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setSending(true);
      setStreamStage('thinking');
      setStreamDraft('');

      try {
        const result = await sendPlanInterviewTurnStream(history, content, {
          onStatus: (stage) => setStreamStage(stage),
          onDelta: (text) => setStreamDraft((curr) => curr + text)
        });
        setMessages((prev) => [
          ...prev,
          {
            id: uid(),
            role: 'assistant',
            content: result.assistantReply
          }
        ]);
        setBrief(result.brief);
        setResearchGoalDraft(result.researchGoalDraft);
        setReadyToGenerate(result.readyToGenerate);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not continue the interview'
        );
      } finally {
        setSending(false);
        setStreamStage(null);
        setStreamDraft('');
        inputRef.current?.focus();
      }
    },
    [input, sending, isGenerating, messages]
  );

  const handleGenerate = useCallback(async () => {
    if (!generateEnabled) return;
    let goal = researchGoalDraft.trim();
    if (brief.titleHint.trim()) {
      goal = `Survey title: ${brief.titleHint.trim()}\n\n${goal}`;
    }
    if (goal.length < 10) {
      toast.error('Need a clearer research goal before generating.');
      return;
    }

    setIsGenerating(true);
    try {
      const plan = await createPlanWithAI({ researchGoal: goal });
      clearInterviewDraft();
      toast.success('Plan generated', {
        description: 'Review and refine your survey plan next.'
      });
      router.push(`/dashboard/plans/${plan.id}`);
    } catch (err) {
      toast.error('Could not generate plan', {
        description:
          err instanceof Error && err.message
            ? err.message
            : 'Please try again.'
      });
      setIsGenerating(false);
    }
  }, [generateEnabled, researchGoalDraft, brief.titleHint, router]);

  return (
    <div className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
      <SurvaiPanel className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
        <div className='relative shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 py-4 sm:px-6'>
          <div
            className='pointer-events-none absolute inset-0 opacity-35'
            aria-hidden
            style={{
              backgroundImage:
                'linear-gradient(to right, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in srgb, var(--foreground) 8%, transparent) 1px, transparent 1px)',
              backgroundSize: '18px 18px',
              maskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent, black 20%, black 80%, transparent)'
            }}
          />
          <div className='relative flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <div className='mb-1 flex items-center gap-2'>
                <Link
                  href='/dashboard/surveys'
                  className='text-foreground/70 hover:text-foreground inline-flex items-center gap-1 text-xs font-medium'
                >
                  <Icons.chevronLeft className='size-3.5' />
                  Surveys
                </Link>
              </div>
              <h2 className='font-display text-2xl font-extrabold tracking-tight text-foreground'>
                {brief.titleHint.trim() || 'New survey plan'}
              </h2>
              <p className='mt-0.5 text-sm leading-relaxed text-foreground/70'>
                Chat to shape the research goal, then generate the plan
              </p>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              {hasProgress ? (
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  disabled={sending || isGenerating}
                  onClick={handleStartOver}
                  className='h-8 rounded-xl px-2.5 text-xs text-foreground/80 hover:bg-foreground/10 hover:text-foreground'
                >
                  Start over
                </Button>
              ) : null}
              <Button
                type='button'
                size='sm'
                disabled={!generateEnabled}
                onClick={() => void handleGenerate()}
                className={cn(
                  brandCtaClass,
                  'h-8 shrink-0 px-3 text-xs disabled:opacity-60'
                )}
              >
                {isGenerating ? (
                  <Icons.spinner className='mr-1 size-3.5 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-1 size-3.5' />
                )}
                Generate plan
              </Button>
            </div>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
          <aside className='flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden border-b border-border bg-[color-mix(in_srgb,var(--background)_70%,var(--muted))] lg:max-h-none lg:h-full lg:w-80 lg:border-r lg:border-b-0'>
            <div className='flex shrink-0 items-center gap-2 border-b border-border/80 px-3.5 py-3'>
              <div className='flex size-7 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                <Icons.plan className='size-3.5' />
              </div>
              <div className='min-w-0'>
                <p className='font-display text-sm font-bold tracking-tight text-foreground'>
                  Brief so far
                </p>
                <p className='text-muted-foreground text-[10px] leading-none'>
                  Edit inline or refine in chat
                </p>
              </div>
            </div>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3'>
              {briefHasContent(brief) || researchGoalDraft.trim() ? (
                <div className='space-y-3.5'>
                  <EditableBriefField
                    icon='page'
                    label='Working title'
                    value={brief.titleHint}
                    emphasize
                    disabled={sending || isGenerating}
                    onChange={(titleHint) =>
                      setBrief((prev) => ({ ...prev, titleHint }))
                    }
                  />
                  <EditableBriefField
                    icon='text'
                    label='Summary'
                    value={brief.summary}
                    multiline
                    disabled={sending || isGenerating}
                    onChange={(summary) =>
                      setBrief((prev) => ({ ...prev, summary }))
                    }
                  />
                  <EditableBriefField
                    icon='sparkles'
                    label='Research goal'
                    value={researchGoalDraft}
                    multiline
                    disabled={sending || isGenerating}
                    onChange={setResearchGoalDraft}
                  />
                  <EditableChipList
                    icon='users'
                    label='Audiences'
                    items={brief.audiences}
                    tone='brand'
                    disabled={sending || isGenerating}
                    onChange={(audiences) =>
                      setBrief((prev) => ({ ...prev, audiences }))
                    }
                  />
                  <EditableChipList
                    icon='checks'
                    label='Decisions'
                    items={brief.decisions}
                    tone='neutral'
                    disabled={sending || isGenerating}
                    onChange={(decisions) =>
                      setBrief((prev) => ({ ...prev, decisions }))
                    }
                  />
                  <EditableChipList
                    icon='adjustments'
                    label='Constraints'
                    items={brief.constraints}
                    tone='neutral'
                    disabled={sending || isGenerating}
                    onChange={(constraints) =>
                      setBrief((prev) => ({ ...prev, constraints }))
                    }
                  />
                  {readyToGenerate ? (
                    <div className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft px-3 py-2.5'>
                      <div className='flex items-start gap-2'>
                        <Icons.circleCheck className='mt-0.5 size-3.5 shrink-0 text-foreground' />
                        <div className='min-w-0'>
                          <p className='text-xs font-semibold text-foreground'>
                            Ready to generate
                          </p>
                          <p className='text-foreground/75 mt-0.5 text-[11px] leading-relaxed'>
                            SurvAI can draft objectives, questions, and sections
                            from this brief.
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='text-muted-foreground border-t border-border/70 pt-3 text-[11px] leading-relaxed'>
                      Keep chatting to refine audience, decisions, and scope.
                    </p>
                  )}
                </div>
              ) : (
                <div className='space-y-3'>
                  <div className='rounded-xl border border-dashed border-border bg-card/60 px-3 py-3'>
                    <p className='text-sm font-medium text-foreground'>
                      Nothing captured yet
                    </p>
                    <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
                      Start with a research idea — starters below seed the chat.
                    </p>
                  </div>
                  <div className='flex flex-col gap-1.5'>
                    {STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type='button'
                        disabled={sending || isGenerating}
                        onClick={() => void handleSend(starter)}
                        className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-card px-2.5 py-2 text-left text-[11px] font-medium leading-snug text-foreground transition-colors hover:bg-brand-soft disabled:opacity-60'
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          <div className='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden'>
            <div
              aria-live='polite'
              className='flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 md:px-8'
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 90% 45% at 50% 0%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%),
                  radial-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px)
                `,
                backgroundSize: 'auto, 16px 16px'
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' ? <AssistantAvatar /> : null}
                  <div
                    className={cn(
                      'max-w-[min(100%,36rem)] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-foreground text-background'
                        : 'rounded-bl-md border border-border bg-card/95 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                    )}
                  >
                    <p className='whitespace-pre-wrap break-words'>
                      {msg.content}
                    </p>
                  </div>
                </div>
              ))}

              {userTurnCount === 0 && !sending ? (
                <div className='flex flex-wrap gap-1.5 pl-11 lg:hidden'>
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type='button'
                      disabled={sending || isGenerating}
                      onClick={() => void handleSend(starter)}
                      className='rounded-full border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-brand-soft'
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              ) : null}

              {sending ? (
                <div
                  className='flex gap-2.5 animate-in fade-in duration-200'
                  aria-label={
                    streamDraft
                      ? 'SurvAI is answering'
                      : STAGE_LABELS[streamStage ?? ''] || 'SurvAI is working'
                  }
                >
                  <AssistantAvatar />
                  <div className='max-w-[min(100%,36rem)] space-y-2 rounded-2xl rounded-bl-md border border-border bg-card/95 px-3.5 py-2.5 text-sm leading-relaxed shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
                    {streamDraft ? (
                      <p className='whitespace-pre-wrap break-words'>
                        {streamDraft}
                      </p>
                    ) : (
                      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                        <span className='flex items-center gap-1.5'>
                          {[0, 1, 2].map((dot) => (
                            <span
                              key={dot}
                              className='size-1.5 animate-bounce rounded-full bg-foreground/45'
                              style={{
                                animationDelay: `${dot * 140}ms`,
                                animationDuration: '900ms'
                              }}
                            />
                          ))}
                        </span>
                        <span>
                          {STAGE_LABELS[streamStage ?? ''] ?? 'Working…'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {isGenerating ? (
                <div className='border-border bg-card mx-auto w-full max-w-xl overflow-hidden rounded-2xl border shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'>
                  <div className='flex items-start justify-between gap-3 border-b border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand px-4 py-4 sm:px-5'>
                    <div className='flex min-w-0 items-start gap-3'>
                      <div className='mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--foreground)_18%,transparent)] bg-card/70 text-foreground'>
                        <Icons.sparkles className='size-4' />
                      </div>
                      <div className='min-w-0 space-y-1'>
                        <p className='font-display text-[1.05rem] leading-snug font-extrabold tracking-tight text-foreground'>
                          Generating survey plan
                        </p>
                        <p className='text-foreground/75 text-xs leading-relaxed'>
                          Drafting from your research goal — usually 10–20
                          seconds.
                        </p>
                      </div>
                    </div>
                    <Icons.spinner className='mt-1 size-4 shrink-0 animate-spin text-foreground' />
                  </div>
                  <div className='px-4 py-4 sm:px-5'>
                    <PlanGenerationProgress
                      active={isGenerating}
                      goalPreview={researchGoalDraft}
                    />
                  </div>
                </div>
              ) : null}

              {readyToGenerate && !isGenerating && !sending ? (
                <div className='border-border bg-card/95 mx-auto max-w-md rounded-2xl border px-4 py-3 text-center shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
                  <p className='text-sm font-medium text-foreground'>
                    Ready when you are
                  </p>
                  <p className='text-muted-foreground mt-0.5 text-xs'>
                    Generate a full plan from this brief, or keep refining in
                    chat.
                  </p>
                  <Button
                    type='button'
                    size='sm'
                    className={cn(brandCtaClass, 'mt-3')}
                    onClick={() => void handleGenerate()}
                  >
                    <Icons.sparkles className='mr-1 size-3.5' />
                    Generate plan
                  </Button>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <div className='shrink-0 space-y-3 border-t border-border bg-[color-mix(in_srgb,var(--background)_55%,var(--brand-soft))] px-4 py-3.5 sm:px-6 md:px-8'>
              {isGenerating ? (
                <p className='text-muted-foreground text-center text-xs'>
                  Generating with Gemini — please don&apos;t leave this page.
                </p>
              ) : (
                <div className='relative'>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      sending
                        ? 'SurvAI is typing…'
                        : 'Describe what you want to learn…'
                    }
                    disabled={sending || isGenerating}
                    className='h-11 rounded-2xl border-2 border-border bg-card pr-12 text-sm shadow-sm focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))] disabled:opacity-70'
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void handleSend();
                      }
                    }}
                  />
                  <Button
                    size='icon'
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || sending || isGenerating}
                    aria-label='Send message'
                    className={cn(
                      brandCtaClass,
                      'absolute top-1/2 right-1.5 size-8 -translate-y-1/2 rounded-xl p-0'
                    )}
                  >
                    <Icons.send className='size-3.5' />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </SurvaiPanel>
    </div>
  );
}

function AssistantAvatar() {
  return (
    <div
      className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
      aria-hidden
    >
      <Icons.sparkles className='size-3.5' />
    </div>
  );
}

function EditableBriefField({
  label,
  value,
  icon,
  emphasize = false,
  multiline = false,
  disabled = false,
  onChange
}: {
  label: string;
  value: string;
  icon: keyof typeof Icons;
  emphasize?: boolean;
  multiline?: boolean;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const Icon = Icons[icon];
  const sharedClass = cn(
    'w-full resize-none border-0 bg-transparent p-0 text-foreground shadow-none outline-none focus-visible:ring-0',
    emphasize
      ? 'font-display text-[0.95rem] font-bold tracking-tight'
      : 'text-sm leading-snug',
    disabled && 'opacity-70'
  );
  return (
    <div className='rounded-xl border border-border/80 bg-card px-3 py-2.5 shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'>
      <div className='mb-1.5 flex items-center gap-1.5'>
        <Icon className='text-muted-foreground size-3 shrink-0' />
        <p className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
          {label}
        </p>
      </div>
      {multiline ? (
        <Textarea
          value={value}
          disabled={disabled}
          rows={3}
          placeholder={`Add ${label.toLowerCase()}…`}
          className={sharedClass}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          placeholder={`Add ${label.toLowerCase()}…`}
          className={cn(sharedClass, 'h-auto')}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </div>
  );
}

function EditableChipList({
  label,
  items,
  icon,
  tone = 'neutral',
  disabled = false,
  onChange
}: {
  label: string;
  items: string[];
  icon: keyof typeof Icons;
  tone?: 'brand' | 'neutral';
  disabled?: boolean;
  onChange: (items: string[]) => void;
}) {
  const Icon = Icons[icon];
  const [draft, setDraft] = useState('');

  function commitDraft() {
    const next = draft.trim();
    if (!next || disabled) return;
    if (items.some((item) => item.toLowerCase() === next.toLowerCase())) {
      setDraft('');
      return;
    }
    onChange([...items, next]);
    setDraft('');
  }

  return (
    <div>
      <div className='mb-1.5 flex items-center gap-1.5'>
        <Icon className='text-muted-foreground size-3 shrink-0' />
        <p className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
          {label}
        </p>
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {items.map((item) => (
          <span
            key={item}
            className={cn(
              'inline-flex max-w-full items-center gap-1 rounded-lg border px-2 py-1 text-[11px] leading-snug font-medium text-foreground',
              tone === 'brand'
                ? 'border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/70'
                : 'border-border bg-card'
            )}
          >
            <span className='truncate'>{item}</span>
            <button
              type='button'
              disabled={disabled}
              aria-label={`Remove ${item}`}
              className='text-muted-foreground hover:text-foreground disabled:opacity-50'
              onClick={() => onChange(items.filter((entry) => entry !== item))}
            >
              <Icons.close className='size-2.5' />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={draft}
        disabled={disabled}
        placeholder={`Add ${label.toLowerCase().replace(/s$/, '')}…`}
        className='mt-1.5 h-8 rounded-lg border-border/80 bg-card text-[11px]'
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commitDraft();
          }
        }}
        onBlur={commitDraft}
      />
    </div>
  );
}
