'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { ChatMarkdown } from '@/components/chat-markdown';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  SurvaiPanel,
  brandCtaClass,
  panelHeaderToneClass,
  primaryCtaClass
} from '@/components/survai-panel';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

import {
  assistantKeys,
  assistantMessagesOptions,
  assistantThreadsOptions
} from '../api/queries';
import {
  createThread,
  deleteThread,
  sendMessageStream,
  updateThread
} from '../api/service';
import type { AssistantMessage, AssistantThread } from '../api/types';

const STARTERS = [
  'What surveys do we have and how are they performing?',
  'Summarize the latest findings across our reports',
  'Which survey needs the most attention right now?'
] as const;

const STAGE_LABELS: Record<string, string> = {
  saving: 'Saving your question…',
  retrieving: 'Searching org knowledge…',
  planning: 'Planning tools…',
  tools: 'Fetching metrics…',
  answering: 'Writing answer…'
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function ThreadListSkeleton() {
  return (
    <div className='space-y-2 p-2'>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className='space-y-1.5 rounded-xl px-2.5 py-2'>
          <Skeleton className='h-3.5 w-3/4 rounded' />
          <Skeleton className='h-3 w-1/3 rounded' />
        </div>
      ))}
    </div>
  );
}

export function AssistantWorkspace() {
  const queryClient = useQueryClient();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [streamDraft, setStreamDraft] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const threadsQuery = useQuery(assistantThreadsOptions());
  const threads = threadsQuery.data?.threads ?? [];
  const activeThread = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (!activeId && threads.length > 0) {
      setActiveId(threads[0].id);
    }
  }, [activeId, threads]);

  const messagesQuery = useQuery(assistantMessagesOptions(activeId));
  const messages = messagesQuery.data ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending, streamDraft, streamStage]);

  const refreshThreads = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: assistantKeys.threads() });
  }, [queryClient]);

  const handleNewThread = useCallback(async () => {
    try {
      const thread = await createThread();
      await refreshThreads();
      setActiveId(thread.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create chat');
    }
  }, [refreshThreads]);

  const handleDelete = useCallback(
    async (thread: AssistantThread) => {
      try {
        await deleteThread(thread.id);
        if (activeId === thread.id) setActiveId(null);
        await refreshThreads();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not delete chat'
        );
      }
    },
    [activeId, refreshThreads]
  );

  const handleRename = useCallback(
    async (threadId: string) => {
      const title = renameValue.trim();
      if (!title) {
        setRenamingId(null);
        return;
      }
      try {
        await updateThread(threadId, title);
        setRenamingId(null);
        await refreshThreads();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not rename chat'
        );
      }
    },
    [renameValue, refreshThreads]
  );

  const handleSend = useCallback(
    async (override?: string) => {
      const content = (override ?? input).trim();
      if (!content || sending) return;

      let threadId = activeId;
      setSending(true);
      setStreamStage('saving');
      setStreamDraft('');
      try {
        if (!threadId) {
          const thread = await createThread();
          threadId = thread.id;
          setActiveId(threadId);
          await refreshThreads();
        }

        const optimistic: AssistantMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          citations: null,
          createdAt: new Date().toISOString()
        };
        const prev = queryClient.getQueryData<AssistantMessage[]>(
          assistantKeys.messages(threadId)
        );
        queryClient.setQueryData(assistantKeys.messages(threadId), [
          ...(prev ?? []),
          optimistic
        ]);
        setInput('');

        const result = await sendMessageStream(threadId, content, {
          onStatus: (stage) => setStreamStage(stage),
          onDelta: (text) => setStreamDraft((curr) => curr + text)
        });
        queryClient.setQueryData(
          assistantKeys.messages(threadId),
          result.messages
        );
        await refreshThreads();
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : 'Could not send message'
        );
        if (threadId) {
          await queryClient.invalidateQueries({
            queryKey: assistantKeys.messages(threadId)
          });
        }
      } finally {
        setSending(false);
        setStreamStage(null);
        setStreamDraft('');
      }
    },
    [activeId, input, sending, queryClient, refreshThreads]
  );

  const chatTitle =
    activeThread && activeThread.title !== 'New chat'
      ? activeThread.title
      : 'Org research assistant';

  return (
    <div className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
      <SurvaiPanel className='flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden'>
        <div className={cn(panelHeaderToneClass.brand, 'relative shrink-0 px-4 py-4 sm:px-6')}>
          <div className='relative flex flex-wrap items-start justify-between gap-3'>
            <div className='min-w-0 flex-1'>
              <h2 className='font-display text-2xl font-extrabold tracking-tight text-brand-foreground'>
                {chatTitle}
              </h2>
              <p className='text-sm leading-relaxed text-brand-foreground/70'>
                Ask across your surveys, reports, and reviews
              </p>
            </div>
            <Button
              type='button'
              size='sm'
              onClick={() => void handleNewThread()}
              className={cn(primaryCtaClass, 'h-8 shrink-0 gap-1.5 rounded-xl px-3 text-xs')}
            >
              <Icons.add className='mr-1 size-3.5' />
              New chat
            </Button>
          </div>
        </div>

        <div className='flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row'>
          {/* Thread rail */}
          <aside className='flex max-h-[36vh] w-full shrink-0 flex-col overflow-hidden border-b border-border lg:max-h-none lg:h-full lg:w-72 lg:border-r lg:border-b-0'>
            <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
              {threadsQuery.isLoading ? (
                <ThreadListSkeleton />
              ) : threadsQuery.isError ? (
                <div className='flex flex-col items-center px-4 py-10 text-center'>
                  <div className='mb-3 flex size-10 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'>
                    <Icons.alertCircle className='size-4' />
                  </div>
                  <p className='font-display text-sm font-bold tracking-tight'>
                    Couldn’t load chats
                  </p>
                  <p className=' text-xs text-muted-foreground'>
                    Check that you’re signed in, then try again.
                  </p>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='mt-3 rounded-xl'
                    onClick={() => void threadsQuery.refetch()}
                  >
                    Retry
                  </Button>
                </div>
              ) : threads.length === 0 ? (
                <div className='flex flex-col items-center px-4 py-10 text-center'>
                  <div className='mb-3 flex size-10 items-center justify-center rounded-2xl bg-muted text-muted-foreground'>
                    <Icons.chat className='size-4' />
                  </div>
                  <p className='font-display text-sm font-bold tracking-tight'>
                    No chats yet
                  </p>
                  <p className=' text-xs leading-relaxed text-muted-foreground'>
                    Start a conversation to explore your org knowledge.
                  </p>
                </div>
              ) : (
                <div className='space-y-0.5 p-1.5'>
                  {threads.map((thread) => {
                    const active = thread.id === activeId;
                    return (
                      <div
                        key={thread.id}
                        className={cn(
                          'group flex items-start gap-0.5 rounded-xl px-2 py-2 transition-colors',
                          active
                            ? 'border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_10%,transparent)]'
                            : 'hover:bg-muted/70'
                        )}
                      >
                        <button
                          type='button'
                          className='min-w-0 flex-1 text-left'
                          onClick={() => setActiveId(thread.id)}
                        >
                          {renamingId === thread.id ? (
                            <Input
                              autoFocus
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={() => void handleRename(thread.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  void handleRename(thread.id);
                                }
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className='h-7 rounded-lg text-xs'
                            />
                          ) : (
                            <>
                              <div
                                className={cn(
                                  'truncate text-sm font-medium',
                                  active
                                    ? 'text-brand-foreground'
                                    : 'text-foreground'
                                )}
                              >
                                {thread.title}
                              </div>
                              <div
                                className={cn(
                                  'font-mono text-[10px]',
                                  active
                                    ? 'text-brand-foreground/70'
                                    : 'text-muted-foreground'
                                )}
                              >
                                {formatRelative(thread.updatedAt)}
                              </div>
                            </>
                          )}
                        </button>
                        <div className='flex shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100'>
                          <button
                            type='button'
                            aria-label='Rename chat'
                            className={cn(
                              'rounded-lg p-1 hover:bg-card',
                              active
                                ? 'text-brand-foreground/70 hover:text-brand-foreground'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                            onClick={() => {
                              setRenamingId(thread.id);
                              setRenameValue(thread.title);
                            }}
                          >
                            <Icons.edit className='size-3.5' />
                          </button>
                          <button
                            type='button'
                            aria-label='Delete chat'
                            className={cn(
                              'rounded-lg p-1 hover:bg-card hover:text-destructive',
                              active
                                ? 'text-brand-foreground/70'
                                : 'text-muted-foreground'
                            )}
                            onClick={() => void handleDelete(thread)}
                          >
                            <Icons.close className='size-3.5' />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          {/* Chat column */}
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
            {messagesQuery.isLoading && activeId ? (
              <div className='space-y-3 px-1 py-2'>
                <Skeleton className='ml-auto h-16 w-2/3 rounded-2xl' />
                <Skeleton className='h-20 w-3/4 rounded-2xl' />
                <Skeleton className='ml-auto h-12 w-1/2 rounded-2xl' />
              </div>
            ) : messages.length === 0 && !sending ? (
              <div className='space-y-4 px-1 py-2'>
                <div className='flex items-start gap-3'>
                  <div
                    className=' flex size-9 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-muted text-muted-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3.5' />
                  </div>
                  <div className='min-w-0 space-y-1'>
                    <p className='font-display text-base font-bold tracking-tight text-foreground'>
                      Ask anything about your research
                    </p>
                    <p className='text-sm leading-relaxed text-muted-foreground'>
                      Surveys, response trends, report findings, or review
                      quality — answers stay grounded in your org data.
                    </p>
                  </div>
                </div>
                <div className='flex flex-wrap gap-1.5 pl-12'>
                  {STARTERS.map((starter) => (
                    <button
                      key={starter}
                      type='button'
                      disabled={sending}
                      onClick={() => void handleSend(starter)}
                      className='rounded-full border border-border bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50'
                    >
                      {starter}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                {msg.role === 'assistant' ? (
                  <div
                    className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3.5' />
                  </div>
                ) : null}
                <div
                  className={cn(
                    'max-w-[min(100%,36rem)] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'rounded-br-md bg-primary text-primary-foreground'
                      : 'rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <ChatMarkdown content={msg.content} />
                  ) : (
                    <p className='whitespace-pre-wrap break-words'>
                      {msg.content}
                    </p>
                  )}
                  {msg.role === 'assistant' &&
                  msg.citations &&
                  msg.citations.length > 0 ? (
                    <div className='flex flex-wrap gap-1.5 border-t border-border/70 pt-2'>
                      {msg.citations.map((c, i) => {
                        const label =
                          c.sourceType === 'metrics'
                            ? 'Metrics'
                            : c.title || c.sourceType;
                        if (c.href) {
                          return (
                            <Link
                              key={`${c.chunkId ?? 'm'}-${i}`}
                              href={c.href}
                              className='inline-flex max-w-full truncate rounded-full border border-border bg-background/80 px-2 py-0.5 text-[10px] font-medium text-foreground hover:bg-muted/50'
                            >
                              {label}
                            </Link>
                          );
                        }
                        return (
                          <span
                            key={`${c.chunkId ?? 'm'}-${i}`}
                            className='inline-flex max-w-full truncate rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground'
                            title={c.metricRefs?.join(', ')}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))}

            {sending ? (
              <div
                className='flex gap-2.5 animate-in fade-in duration-200'
                aria-label={
                  streamDraft
                    ? 'SurvAI is answering'
                    : STAGE_LABELS[streamStage ?? ''] || 'SurvAI is working'
                }
              >
                <div
                  className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                  aria-hidden
                >
                  <Icons.sparkles className='size-3.5' />
                </div>
                <div className='max-w-[min(100%,36rem)] space-y-2 rounded-2xl rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft px-3.5 py-2.5 text-sm leading-relaxed text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'>
                  {streamDraft ? (
                    <ChatMarkdown content={streamDraft} />
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
            <div ref={endRef} />
          </div>

          <div className='shrink-0 space-y-3 border-t border-border bg-brand-soft/70 px-4 py-3.5 sm:px-6 md:px-8'>
            <div className='relative'>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  sending ? 'SurvAI is typing…' : 'Ask about your org research…'
                }
                disabled={sending}
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
                disabled={!input.trim() || sending}
                aria-label='Send message'
                className={cn(
                  brandCtaClass,
                  'absolute top-1/2 right-1.5 size-8 -translate-y-1/2 rounded-xl p-0'
                )}
              >
                <Icons.send className='size-3.5' />
              </Button>
            </div>
          </div>
          </div>
        </div>
      </SurvaiPanel>
    </div>
  );
}
