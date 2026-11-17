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
import { useLocale, useTranslations } from 'next-intl';

import { ContentLanguagePicker } from '@/components/content-language-picker';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  SurvaiPanel,
  panelHeaderToneClass,
  primaryCtaClass,
  quietActionClass
} from '@/components/survai-panel';
import { isAppLocale } from '@/i18n/config';
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import {
  createPlanWithAI,
  sendPlanInterviewTurnStream
} from '../api/service';
import type {
  ContentLanguage,
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

const STARTER_KEYS = [
  'starterHealthcare',
  'starterDigital',
  'starterWash'
] as const;

const EMPTY_BRIEF: PlanInterviewBrief = {
  titleHint: '',
  audiences: [],
  decisions: [],
  constraints: [],
  summary: ''
};

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

function makeIntro(content: string): ChatMessage[] {
  return [{ id: uid(), role: 'assistant', content }];
}

export function PlanGeneratorWorkspace() {
  const t = useTranslations('plan');
  const tSurveys = useTranslations('surveys');
  const uiLocale = useLocale();
  const defaultContentLanguage: ContentLanguage = isAppLocale(uiLocale)
    ? uiLocale
    : 'en';
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    makeIntro(t('interviewIntro'))
  );
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [streamDraft, setStreamDraft] = useState('');
  const [brief, setBrief] = useState<PlanInterviewBrief>(EMPTY_BRIEF);
  const [researchGoalDraft, setResearchGoalDraft] = useState('');
  const [contentLanguage, setContentLanguage] =
    useState<ContentLanguage>(defaultContentLanguage);
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
    if (authLoading) return;
    if (user && !canEdit) {
      toast.error(t('viewOnlyToast'), {
        description: t('viewersCannotCreate')
      });
      router.replace('/dashboard/surveys');
    }
  }, [authLoading, user, canEdit, router, t]);

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
      if (draft.contentLanguage === 'am' || draft.contentLanguage === 'en') {
        setContentLanguage(draft.contentLanguage);
      }
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
      readyToGenerate,
      contentLanguage
    });
  }, [
    hydrated,
    messages,
    brief,
    contentLanguage,
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
    setMessages(makeIntro(t('interviewIntro')));
    setBrief(EMPTY_BRIEF);
    setResearchGoalDraft('');
    setReadyToGenerate(false);
    setInput('');
    setStreamDraft('');
    setStreamStage(null);
    inputRef.current?.focus();
  }, [sending, isGenerating, t]);

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
        const result = await sendPlanInterviewTurnStream(
          history,
          content,
          {
            onStatus: (stage) => setStreamStage(stage),
            onDelta: (text) => setStreamDraft((curr) => curr + text)
          },
          contentLanguage
        );
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
          err instanceof Error ? err.message : t('interviewFailed')
        );
      } finally {
        setSending(false);
        setStreamStage(null);
        setStreamDraft('');
        inputRef.current?.focus();
      }
    },
    [input, sending, isGenerating, messages, contentLanguage, t]
  );

  const handleGenerate = useCallback(async () => {
    if (!generateEnabled) return;
    let goal = researchGoalDraft.trim();
    if (brief.titleHint.trim()) {
      goal = `Survey title: ${brief.titleHint.trim()}\n\n${goal}`;
    }
    if (goal.length < 10) {
      toast.error(t('needClearerGoal'));
      return;
    }

    setIsGenerating(true);
    try {
      const plan = await createPlanWithAI({
        researchGoal: goal,
        contentLanguage
      });
      clearInterviewDraft();
      toast.success(t('planGenerated'), {
        description: t('planGeneratedDesc')
      });
      router.push(`/dashboard/plans/${plan.id}`);
    } catch (err) {
      toast.error(t('couldNotGenerate'), {
        description:
          err instanceof Error && err.message
            ? err.message
            : t('saveFailedDesc')
      });
      setIsGenerating(false);
    }
  }, [
    generateEnabled,
    researchGoalDraft,
    brief.titleHint,
    contentLanguage,
    router,
    t
  ]);

  if (authLoading || (user && !canEdit)) {
    return (
      <div className='flex h-full w-full flex-1 items-center justify-center'>
        <Icons.spinner className='text-muted-foreground size-6 animate-spin' />
      </div>
    );
  }

  return (
    <div className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
      <SurvaiPanel className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
        <div
          className={cn(
            panelHeaderToneClass.brand,
            'relative shrink-0 px-4 py-3.5 sm:px-6'
          )}
        >
          <div className='relative flex flex-wrap items-center justify-between gap-x-4 gap-y-3'>
            <div className='min-w-0 flex-1 basis-[14rem]'>
              <h2 className='font-display text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                {brief.titleHint.trim() || t('newPlanTitle')}
              </h2>
              <p className='text-sm leading-snug text-brand-foreground/70'>
                {t('newPlanSubtitle')}
              </p>
            </div>

            <div className='flex min-w-0 flex-wrap items-center justify-end gap-2'>
              <ContentLanguagePicker
                value={contentLanguage}
                onChange={setContentLanguage}
                disabled={sending || isGenerating}
                density='compact'
                tone='onBrand'
              />
              <div className='flex items-center gap-1.5'>
                <Link
                  href='/dashboard/surveys'
                  className='inline-flex h-9 items-center gap-1 rounded-xl px-2.5 text-sm font-medium text-brand-foreground/75 transition-colors hover:bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)] hover:text-brand-foreground'
                >
                  <Icons.chevronLeft className='size-4' />
                  {tSurveys('title')}
                </Link>
                {hasProgress ? (
                  <Button
                    type='button'
                    variant='ghost'
                    disabled={sending || isGenerating}
                    onClick={handleStartOver}
                    className='h-9 rounded-xl px-2.5 text-sm text-brand-foreground/75 hover:bg-[color-mix(in_srgb,var(--brand-foreground)_10%,transparent)] hover:text-brand-foreground'
                  >
                    {t('startOver')}
                  </Button>
                ) : null}
                <Button
                  type='button'
                  disabled={!generateEnabled}
                  onClick={() => void handleGenerate()}
                  className={cn(
                    primaryCtaClass,
                    'h-9 shrink-0 gap-1.5 rounded-xl px-3.5 text-sm disabled:opacity-60'
                  )}
                >
                  {isGenerating ? (
                    <Icons.spinner className='size-3.5 animate-spin' />
                  ) : (
                    <Icons.sparkles className='size-3.5' />
                  )}
                  {t('generatePlan')}
                </Button>
              </div>
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
                        {t('briefSoFar')}
                      </p>
                      <p className='text-muted-foreground text-[11px] leading-snug'>
                        {t('briefHint')}
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
                  aria-label={t('briefCompleteness')}
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
                  <BriefSection label={t('briefCore')} hint={t('briefCoreHint')}>
                    <EditableBriefField
                      icon='page'
                      label={t('workingTitle')}
                      value={brief.titleHint}
                      emphasize
                      disabled={briefBusy}
                      onChange={(titleHint) =>
                        setBrief((prev) => ({ ...prev, titleHint }))
                      }
                    />
                    <EditableBriefField
                      icon='text'
                      label={t('summary')}
                      value={brief.summary}
                      multiline
                      disabled={briefBusy}
                      onChange={(summary) =>
                        setBrief((prev) => ({ ...prev, summary }))
                      }
                    />
                    <EditableBriefField
                      icon='sparkles'
                      label={t('researchGoal')}
                      value={researchGoalDraft}
                      multiline
                      disabled={briefBusy}
                      onChange={setResearchGoalDraft}
                    />
                  </BriefSection>

                  <BriefSection label={t('briefScope')} hint={t('briefScopeHint')}>
                    <EditableChipList
                      icon='users'
                      label={t('audiences')}
                      items={brief.audiences}
                      tone='brand'
                      disabled={briefBusy}
                      onChange={(audiences) =>
                        setBrief((prev) => ({ ...prev, audiences }))
                      }
                    />
                    <EditableChipList
                      icon='checks'
                      label={t('decisions')}
                      items={brief.decisions}
                      tone='neutral'
                      disabled={briefBusy}
                      onChange={(decisions) =>
                        setBrief((prev) => ({ ...prev, decisions }))
                      }
                    />
                    <EditableChipList
                      icon='adjustments'
                      label={t('constraints')}
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
                      {t('nothingCaptured')}
                    </p>
                    <p className='text-muted-foreground mx-auto  max-w-[14rem] text-xs leading-relaxed'>
                      {t('nothingCapturedHint')}
                    </p>
                  </div>
                  <div className='space-y-1.5'>
                    <p className='text-muted-foreground px-0.5 text-[10px] font-semibold tracking-wide uppercase'>
                      {t('starters')}
                    </p>
                    {STARTER_KEYS.map((starterKey, index) => (
                      <button
                        key={starterKey}
                        type='button'
                        disabled={briefBusy}
                        onClick={() => void handleSend(t(starterKey))}
                        className='group flex w-full items-start gap-2.5 rounded-xl border border-border bg-card px-2.5 py-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] hover:bg-brand-soft/60 disabled:opacity-60'
                      >
                        <span className=' flex size-5 shrink-0 items-center justify-center rounded-md bg-muted font-mono text-[10px] font-bold text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground'>
                          {index + 1}
                        </span>
                        <span className='text-[11px] font-medium leading-snug text-foreground'>
                          {t(starterKey)}
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
                          {t('readyToGenerate')}
                        </p>
                        <p className='text-muted-foreground  text-[11px] leading-relaxed'>
                          {t('readyToGenerateHint')}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className='text-muted-foreground px-0.5 text-[11px] leading-relaxed'>
                    {t('keepChatting')}
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
                        ? 'rounded-br-md bg-primary text-primary-foreground'
                        : 'rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
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
                  {STARTER_KEYS.map((starterKey) => (
                    <button
                      key={starterKey}
                      type='button'
                      disabled={sending || isGenerating}
                      onClick={() => void handleSend(t(starterKey))}
                      className='rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50'
                    >
                      {t(starterKey)}
                    </button>
                  ))}
                </div>
              ) : null}

              {sending ? (
                <div
                  className='flex gap-2.5 animate-in fade-in duration-200'
                  aria-label={
                    streamDraft
                      ? t('answeringAria')
                      : streamStage === 'thinking'
                        ? t('stageThinking')
                        : streamStage === 'answering'
                          ? t('stageAnswering')
                          : t('workingAria')
                  }
                >
                  <AssistantAvatar />
                  <div className='max-w-[min(100%,36rem)] space-y-2 rounded-2xl rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-soft px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
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
                          {streamStage === 'thinking'
                            ? t('stageThinking')
                            : streamStage === 'answering'
                              ? t('stageAnswering')
                              : t('working')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {readyToGenerate && !isGenerating && !sending ? (
                <div className='mx-auto flex w-full max-w-2xl flex-col gap-4 rounded-2xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-5 py-6 text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_14%,transparent)] sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-7 sm:py-7'>
                  <div className='min-w-0'>
                    <p className='font-display text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                      {t('readyWhenYouAre')}
                    </p>
                    <p className='max-w-md text-sm leading-relaxed text-brand-foreground/75 sm:text-[0.95rem]'>
                      {t('readyBannerBody')}
                    </p>
                  </div>
                  <Button
                    type='button'
                    className='h-11 shrink-0 rounded-xl border border-[color-mix(in_srgb,var(--primary)_40%,transparent)] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_18%,transparent)] hover:brightness-110'
                    onClick={() => void handleGenerate()}
                  >
                    {t('generatePlan')}
                  </Button>
                </div>
              ) : null}

              <div ref={endRef} />
            </div>

            <div className='shrink-0 space-y-3 border-t border-border bg-brand-soft/70 px-4 py-3.5 sm:px-6 md:px-8'>
              {isGenerating ? (
                <p className='text-muted-foreground text-center text-xs'>
                  {t('generatingStay')}
                </p>
              ) : (
                <div className='relative'>
                  <Input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={
                      sending ? t('typing') : t('inputPlaceholder')
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
                    aria-label={t('sendMessage')}
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

      <Dialog
        open={isGenerating}
        onOpenChange={(next) => {
          if (!next && isGenerating) return;
        }}
      >
        <DialogContent
          className='sm:max-w-md gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none ring-0'
          showCloseButton={false}
        >
          <DialogTitle className='sr-only'>{t('generatingPlanTitle')}</DialogTitle>
          <PlanGenerationProgress
            active={isGenerating}
            goalPreview={researchGoalDraft}
          />
        </DialogContent>
      </Dialog>
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
  const t = useTranslations('plan');
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
        'group block cursor-text rounded-xl border bg-brand-soft px-3 py-2.5 transition-[border-color,box-shadow,background-color]',
        filled
          ? 'border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'
          : 'border-dashed border-[color-mix(in_srgb,var(--brand)_28%,var(--border))]',
        'focus-within:border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] focus-within:bg-brand-soft focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--brand)_18%,transparent)]'
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
            {t('empty')}
          </span>
        )}
      </div>
      {multiline ? (
        <Textarea
          value={value}
          disabled={disabled}
          rows={emphasize ? 2 : 3}
          placeholder={t('addField', { label: label.toLowerCase() })}
          className={sharedClass}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <Input
          value={value}
          disabled={disabled}
          placeholder={t('addField', { label: label.toLowerCase() })}
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
  const t = useTranslations('plan');
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
        'rounded-xl border bg-brand-soft px-3 py-2.5 transition-[border-color,box-shadow]',
        filled
          ? 'border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_4%,transparent)]'
          : 'border-dashed border-[color-mix(in_srgb,var(--brand)_28%,var(--border))]'
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
                aria-label={t('removeItem', { item })}
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
          {t('noItemsYet', { label: singular })}
        </p>
      )}

      <div className='relative'>
        <Input
          value={draft}
          disabled={disabled}
          placeholder={t('addField', { label: singular })}
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
          aria-label={t('addItem', { item: singular })}
          onClick={commitDraft}
          className='absolute top-1/2 right-1 flex size-6 -translate-y-1/2 items-center justify-center rounded-md bg-primary text-primary-foreground transition-opacity disabled:opacity-30'
        >
          <Icons.add className='size-3' />
        </button>
      </div>
    </div>
  );
}
