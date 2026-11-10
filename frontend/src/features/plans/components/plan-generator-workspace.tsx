'use client';

import Link from 'next/link';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useRouter } from 'next/navigation';

import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SurvaiPanel,
  compactCtaClass,
  panelHeaderToneClass,
  quietActionClass
} from '@/components/survai-panel';
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

  const briefChecks = [
    Boolean(brief.titleHint.trim()),
    Boolean(brief.summary.trim()),
    Boolean(researchGoalDraft.trim()),
    brief.audiences.length > 0,
    brief.decisions.length > 0,
    brief.constraints.length > 0
  ];
  const briefFilled = briefChecks.filter(Boolean).length;
  const briefTotal = briefChecks.length;
  const briefBusy = sending || isGenerating;

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
        <div className={cn(panelHeaderToneClass.primary, 'relative shrink-0 px-4 py-4 sm:px-6')}>
          <div className='relative flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <h2 className='font-display text-2xl font-extrabold tracking-tight text-white'>
                {brief.titleHint.trim() || 'New survey plan'}
              </h2>
              <p className='text-sm leading-relaxed text-[color-mix(in_srgb,var(--gold)_55%,white)]'>
                Chat to shape the research goal, then generate the plan
              </p>
            </div>
            <div className='flex shrink-0 items-center gap-2'>
              <Link
                href='/dashboard/surveys'
                className='inline-flex h-8 items-center gap-1 rounded-xl px-2.5 text-xs font-medium text-primary-foreground/80 transition-colors hover:bg-primary-foreground/12 hover:text-primary-foreground'
              >
                <Icons.chevronLeft className='size-3.5' />
                Surveys
              </Link>
              {hasProgress ? (
                <Button
                  type='button'
                  size='sm'
                  variant='ghost'
                  disabled={sending || isGenerating}
                  onClick={handleStartOver}
                  className='h-8 rounded-xl px-2.5 text-xs text-primary-foreground/80 hover:bg-primary-foreground/12 hover:text-primary-foreground'
                >
                  Start over
                </Button>
              ) : null}
              <Button
                type='button'
                size='sm'
                disabled={!generateEnabled}
                onClick={() => void handleGenerate()}
                className={cn(compactCtaClass, 'shrink-0 rounded-xl disabled:opacity-60')}
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
          <aside className='flex max-h-[40vh] w-full shrink-0 flex-col overflow-hidden border-b border-border bg-card lg:max-h-none lg:h-full lg:w-[22rem] lg:border-r lg:border-b-0'>
            <div className='shrink-0 border-b border-border bg-brand-soft px-4 py-3.5'>
              <div className='flex items-start justify-between gap-3'>
                <div className='min-w-0'>
                  <div className='flex items-center gap-2'>
                    <div className='flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm'>
                      <Icons.plan className='size-3.5' />
                    </div>
                    <div className='min-w-0'>
                      <p className='font-display text-sm font-extrabold tracking-tight text-foreground'>
                        Brief so far
                      </p>
                      <p className='text-muted-foreground text-[11px] leading-snug'>
                        Edit here or refine in chat
                      </p>
                    </div>
                  </div>
                </div>
                {briefHasContent(brief) || researchGoalDraft.trim() ? (
                  <div className='shrink-0 rounded-full bg-card px-2 py-0.5 font-mono text-[10px] font-semibold tabular-nums text-foreground shadow-sm ring-1 ring-border'>
                    {briefFilled}/{briefTotal}
                  </div>
                ) : null}
              </div>
              {briefHasContent(brief) || researchGoalDraft.trim() ? (
                <div
                  className='mt-3 h-1.5 overflow-hidden rounded-full bg-card/70'
                  role='progressbar'
                  aria-valuenow={briefFilled}
                  aria-valuemin={0}
                  aria-valuemax={briefTotal}
                  aria-label='Brief completeness'
                >
                  <div
                    className='h-full rounded-full bg-primary transition-[width] duration-300 ease-out'
                    style={{
                      width: `${Math.round((briefFilled / briefTotal) * 100)}%`
                    }}
                  />
                </div>
              ) : null}
            </div>

            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3'>
              {briefHasContent(brief) || researchGoalDraft.trim() ? (
                <div className='space-y-4'>
                  <BriefSection label='Core' hint='What this survey is about'>
                    <EditableBriefField
                      icon='page'
                      label='Working title'
                      value={brief.titleHint}
                      emphasize
                      disabled={briefBusy}
                      onChange={(titleHint) =>
                        setBrief((prev) => ({ ...prev, titleHint }))
                      }
                    />
                    <EditableBriefField
                      icon='text'
                      label='Summary'
                      value={brief.summary}
                      multiline
                      disabled={briefBusy}
                      onChange={(summary) =>
                        setBrief((prev) => ({ ...prev, summary }))
                      }
                    />
                    <EditableBriefField
                      icon='sparkles'
                      label='Research goal'
                      value={researchGoalDraft}
                      multiline
                      disabled={briefBusy}
                      onChange={setResearchGoalDraft}
                    />
                  </BriefSection>

                  <BriefSection label='Scope' hint='Who, why, and limits'>
                    <EditableChipList
                      icon='users'
                      label='Audiences'
                      items={brief.audiences}
                      tone='brand'
                      disabled={briefBusy}
                      onChange={(audiences) =>
                        setBrief((prev) => ({ ...prev, audiences }))
                      }
                    />
                    <EditableChipList
                      icon='checks'
                      label='Decisions'
                      items={brief.decisions}
                      tone='neutral'
                      disabled={briefBusy}
                      onChange={(decisions) =>
                        setBrief((prev) => ({ ...prev, decisions }))
                      }
                    />
                    <EditableChipList
                      icon='adjustments'
                      label='Constraints'
                      items={brief.constraints}
                      tone='neutral'
                      disabled={briefBusy}
                      onChange={(constraints) =>
                        setBrief((prev) => ({ ...prev, constraints }))
                      }
                    />
                  </BriefSection>
                </div>
              ) : (
                <div className='flex h-full flex-col gap-3'>
                  <div className='rounded-2xl border border-dashed border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft/50 px-3.5 py-4 text-center'>
                    <div className='mx-auto mb-2.5 flex size-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
                      <Icons.sparkles className='size-4' />
                    </div>
                    <p className='font-display text-sm font-bold tracking-tight text-foreground'>
                      Nothing captured yet
                    </p>
                    <p className='text-muted-foreground mx-auto  max-w-[14rem] text-xs leading-relaxed'>
                      Chat a research idea, or tap a starter to seed the brief.
                    </p>
                  </div>
                  <div className='space-y-1.5'>
                    <p className='text-muted-foreground px-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                      Starters
                    </p>
                    {STARTERS.map((starter, index) => (
                      <button
                        key={starter}
                        type='button'
                        disabled={briefBusy}
                        onClick={() => void handleSend(starter)}
                        className='group flex w-full items-start gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] hover:bg-brand-soft/60 disabled:opacity-60'
                      >
                        <span className=' flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-bold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground'>
                          {index + 1}
                        </span>
                        <span className='text-[11px] font-medium leading-snug text-foreground'>
                          {starter}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {briefHasContent(brief) || researchGoalDraft.trim() ? (
              <div className='shrink-0 border-t border-border bg-card px-3 py-3'>
                {readyToGenerate || generateEnabled ? (
                  <div className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-3 py-2.5'>
                    <div className='flex items-start gap-2'>
                      <div className=' flex size-6 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground'>
                        <Icons.circleCheck className='size-3.5' />
                      </div>
                      <div className='min-w-0'>
                        <p className='text-xs font-semibold text-foreground'>
                          Ready to generate
                        </p>
                        <p className='text-muted-foreground  text-[11px] leading-relaxed'>
                          SurvAI can draft objectives, questions, and sections
                          from this brief.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className='text-muted-foreground px-0.5 text-[11px] leading-relaxed'>
                    Keep chatting to refine audience, decisions, and scope.
                  </p>
                )}
              </div>
            ) : null}
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
                        : 'rounded-bl-md border border-border bg-muted/70 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
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
                      className='rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50'
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
                  <div className='max-w-[min(100%,36rem)] space-y-2 rounded-2xl rounded-bl-md border border-border bg-muted/70 px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
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
                <PlanGenerationProgress
                  active={isGenerating}
                  goalPreview={researchGoalDraft}
                />
              ) : null}

              {readyToGenerate && !isGenerating && !sending ? (
                <div className='mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-7'>
                  <div className='min-w-0'>
                    <p className='font-display text-xl font-extrabold tracking-tight text-foreground sm:text-2xl'>
                      Ready when you are
                    </p>
                    <p className='text-muted-foreground  max-w-md text-sm leading-relaxed sm:text-[0.95rem]'>
                      Generate a full plan from this brief, or keep refining in
                      chat.
                    </p>
                  </div>
                  <Button
                    type='button'
                    className='h-11 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-5 text-sm font-semibold text-background shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] hover:bg-foreground/90'
                    onClick={() => void handleGenerate()}
                  >
                    Generate plan
                  </Button>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <div className='shrink-0 space-y-3 border-t border-border bg-brand-soft/70 px-4 py-3.5 sm:px-6 md:px-8'>
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
                    className='h-11 rounded-2xl border border-border bg-card pr-12 text-sm shadow-sm focus-visible:border-ring disabled:opacity-70'
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
                      quietActionClass,
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
      className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-border bg-muted text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
      aria-hidden
    >
      <Icons.sparkles className='size-3.5' />
    </div>
  );
}

function BriefSection({
  label,
  hint,
  children
}: {
  label: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className='space-y-2'>
      <div className='px-0.5'>
        <p className='text-[11px] font-semibold tracking-wide text-foreground uppercase'>
          {label}
        </p>
        <p className='text-muted-foreground text-[10px] leading-snug'>{hint}</p>
      </div>
      <div className='space-y-2'>{children}</div>
    </section>
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
  const filled = Boolean(value.trim());
  const sharedClass = cn(
    'w-full resize-none border-0 bg-transparent p-0 text-foreground shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0',
    emphasize
      ? 'font-display text-[0.95rem] font-bold tracking-tight'
      : 'text-sm leading-relaxed',
    disabled && 'cursor-default opacity-70'
  );

  return (
    <label
      className={cn(
        'group block cursor-text rounded-xl border bg-card px-3 py-2.5 transition-[border-color,box-shadow,background-color]',
        filled
          ? 'border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'
          : 'border-dashed border-border',
        'focus-within:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] focus-within:bg-brand-soft/40 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]'
      )}
    >
      <div className='mb-1.5 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-md transition-colors',
              filled
                ? 'bg-brand-soft text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className='size-3' />
          </span>
          <span className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
            {label}
          </span>
        </div>
        {filled ? (
          <span className='bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums'>
            {value.trim().length}
          </span>
        ) : (
          <span className='text-muted-foreground/80 text-[9px] font-medium tracking-wide uppercase'>
            Empty
          </span>
        )}
      </div>
      {multiline ? (
        <Textarea
          value={value}
          disabled={disabled}
          rows={emphasize ? 2 : 3}
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
    </label>
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
  const filled = items.length > 0;
  const singular = label.toLowerCase().replace(/s$/, '');

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
    <div
      className={cn(
        'rounded-xl border bg-card px-3 py-2.5 transition-[border-color,box-shadow]',
        filled
          ? 'border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'
          : 'border-dashed border-border'
      )}
    >
      <div className='mb-2 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-1.5'>
          <span
            className={cn(
              'flex size-5 items-center justify-center rounded-md',
              filled
                ? 'bg-brand-soft text-primary'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Icon className='size-3' />
          </span>
          <p className='text-muted-foreground text-[10px] font-semibold tracking-wide uppercase'>
            {label}
          </p>
        </div>
        <span className='bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-mono text-[9px] font-semibold tabular-nums'>
          {items.length}
        </span>
      </div>

      {filled ? (
        <div className='mb-2 flex flex-wrap gap-1.5'>
          {items.map((item) => (
            <span
              key={item}
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-lg px-2 py-1 text-[11px] leading-snug font-medium text-foreground',
                tone === 'brand'
                  ? 'border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-brand-soft'
                  : 'border border-border bg-muted/50'
              )}
            >
              <span className='truncate'>{item}</span>
              <button
                type='button'
                disabled={disabled}
                aria-label={`Remove ${item}`}
                className='text-muted-foreground hover:text-destructive rounded-sm transition-colors disabled:opacity-50'
                onClick={() =>
                  onChange(items.filter((entry) => entry !== item))
                }
              >
                <Icons.close className='size-2.5' />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className='text-muted-foreground mb-2 text-[11px] leading-snug'>
          No {singular}s yet — add one below.
        </p>
      )}

      <div className='relative'>
        <Input
          value={draft}
          disabled={disabled}
          placeholder={`Add ${singular}…`}
          className='h-8 rounded-lg border-border bg-background pr-9 text-[11px] focus-visible:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))]'
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitDraft();
            }
          }}
          onBlur={commitDraft}
        />
        <button
          type='button'
          disabled={disabled || !draft.trim()}
          aria-label={`Add ${singular}`}
          onClick={commitDraft}
          className='absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-30'
        >
          <Icons.add className='size-3' />
        </button>
      </div>
    </div>
  );
}
