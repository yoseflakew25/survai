'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { reportChatOptions, reportKeys, reportOptions } from '../api/queries';
import {
  downloadReportExport,
  generateReport,
  regenerateReportSection,
  sendReportChat,
  updateReport
} from '../api/service';
import type { ReportSection, SurveyReport } from '../api/types';

interface ReportViewProps {
  surveyId: string;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function inlineBold(text: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className='font-semibold text-foreground'>
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function renderSectionContent(content: string): ReactNode[] {
  return content.split('\n').map((line, i) => {
    if (!line.trim()) return <div key={i} className='h-2' />;

    const numbered = line.match(/^\d+\.\s+(.*)$/);
    const dashed = line.match(/^[-•]\s+(.*)$/);
    const bulletText = numbered?.[1] ?? dashed?.[1];

    if (bulletText) {
      return (
        <div key={i} className='flex gap-2.5'>
          <span className='mt-[8px] size-1.5 shrink-0 rounded-full bg-brand' />
          <p className='flex-1'>{inlineBold(bulletText)}</p>
        </div>
      );
    }

    return (
      <p key={i} className={cn(line.startsWith('**') && 'font-medium')}>
        {inlineBold(line)}
      </p>
    );
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

const brandCtaClass =
  'h-10 rounded-xl border border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand font-semibold text-brand-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] transition-[filter,box-shadow] hover:brightness-105 hover:shadow-[0_0_0_4px_color-mix(in_srgb,var(--brand)_35%,transparent)]';

export function ReportView({ surveyId }: ReportViewProps) {
  const queryClient = useQueryClient();
  const { data: report, isLoading, isError, error, refetch } = useQuery(
    reportOptions(surveyId)
  );
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [draftSection, setDraftSection] = useState<ReportSection | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (report?.sections) {
      setSections(report.sections);
      setReportTitle(report.title);
    } else {
      setSections([]);
      setReportTitle('');
    }
  }, [report?.id, report?.updatedAt, report?.sections, report?.title]);

  const chatQuery = useQuery(reportChatOptions(report?.id ?? null));
  const chatMessages = chatQuery.data ?? [];

  useEffect(() => {
    const el = messagesEndRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chatMessages, isReplying]);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const totalWords = sections.reduce((sum, s) => sum + countWords(s.content), 0);

  const applyReport = useCallback(
    (next: SurveyReport) => {
      queryClient.setQueryData(reportKeys.detail(surveyId), next);
      setSections(next.sections);
      setReportTitle(next.title);
    },
    [queryClient, surveyId]
  );

  const handleGenerateReport = useCallback(async () => {
    setIsGenerating(true);
    setActiveSection(null);
    setDraftSection(null);
    try {
      const next = await generateReport(surveyId);
      applyReport(next);
      await queryClient.invalidateQueries({
        queryKey: reportKeys.chat(next.id)
      });
      toast.success('Report generated', {
        description: 'AI drafted a grounded report from your metrics snapshot.'
      });
    } catch (err) {
      toast.error('Generation failed', {
        description:
          err instanceof Error
            ? err.message
            : 'Could not generate the report. Please try again.'
      });
    } finally {
      setIsGenerating(false);
    }
  }, [applyReport, queryClient, surveyId]);

  const startEditSection = useCallback((section: ReportSection) => {
    setDraftSection({ ...section });
    setActiveSection(section.id);
  }, []);

  const cancelEditSection = useCallback(() => {
    if (draftSection) {
      setSections((prev) =>
        prev.map((s) => (s.id === draftSection.id ? draftSection : s))
      );
    }
    setActiveSection(null);
    setDraftSection(null);
  }, [draftSection]);

  const handleSaveSection = useCallback(async () => {
    if (!report || !activeSection) return;
    const section = sections.find((s) => s.id === activeSection);
    if (!section) return;
    if (!section.title.trim()) {
      toast.error('Title required', {
        description: 'Give this section a title before saving.'
      });
      return;
    }
    if (!section.content.trim()) {
      toast.error('Section cannot be empty', {
        description: 'Add some content before saving.'
      });
      return;
    }
    setSaving(true);
    try {
      const next = await updateReport(report.id, { sections });
      applyReport(next);
      setActiveSection(null);
      setDraftSection(null);
      toast.success('Section saved');
    } catch (err) {
      toast.error('Save failed', {
        description:
          err instanceof Error ? err.message : 'Could not save section.'
      });
    } finally {
      setSaving(false);
    }
  }, [activeSection, applyReport, report, sections]);

  const handleSaveTitle = useCallback(async () => {
    if (!report) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      toast.error('Title required');
      return;
    }
    if (nextTitle === report.title) {
      setEditingTitle(false);
      return;
    }
    setSaving(true);
    try {
      const next = await updateReport(report.id, { title: nextTitle });
      applyReport(next);
      setEditingTitle(false);
      toast.success('Title updated');
    } catch (err) {
      toast.error('Save failed', {
        description:
          err instanceof Error ? err.message : 'Could not save title.'
      });
    } finally {
      setSaving(false);
    }
  }, [applyReport, report, titleDraft]);

  const handleRegenerateSection = useCallback(
    async (sectionId: string) => {
      if (!report) return;
      if (
        activeSection === sectionId &&
        draftSection &&
        (draftSection.title !==
          sections.find((s) => s.id === sectionId)?.title ||
          draftSection.content !==
            sections.find((s) => s.id === sectionId)?.content)
      ) {
        // discard local edits before AI rewrite
      }
      setRegeneratingId(sectionId);
      setActiveSection(null);
      setDraftSection(null);
      try {
        const next = await regenerateReportSection(report.id, sectionId);
        applyReport(next);
        toast.success('Section regenerated', {
          description: 'Rewrote this section from the same metrics snapshot.'
        });
      } catch (err) {
        toast.error('Regenerate failed', {
          description:
            err instanceof Error
              ? err.message
              : 'Could not regenerate this section.'
        });
      } finally {
        setRegeneratingId(null);
      }
    },
    [activeSection, applyReport, draftSection, report, sections]
  );

  const handleSendMessage = useCallback(
    async (override?: string) => {
      const message = (override ?? chatInput).trim();
      if (!message || isReplying || !report) return;
      setChatInput('');
      setIsReplying(true);
      try {
        const messages = await sendReportChat(report.id, message);
        queryClient.setQueryData(reportKeys.chat(report.id), messages);
      } catch (err) {
        toast.error('Chat failed', {
          description:
            err instanceof Error ? err.message : 'Could not send message.'
        });
      } finally {
        setIsReplying(false);
      }
    },
    [chatInput, isReplying, queryClient, report]
  );

  const handleExport = useCallback(
    async (format: 'docx' | 'pdf') => {
      if (!report) return;
      setIsExporting(true);
      try {
        await downloadReportExport(report.id, format, report.title);
        toast.success(`Exported as ${format.toUpperCase()}`, {
          description:
            'Download started (text fallback until binary renderers ship).'
        });
      } catch (err) {
        toast.error('Export failed', {
          description:
            err instanceof Error
              ? err.message
              : `Could not export as ${format.toUpperCase()}.`
        });
      } finally {
        setIsExporting(false);
      }
    },
    [report]
  );

  if (isLoading) {
    return (
      <div className='flex min-h-[40vh] items-center justify-center'>
        <Icons.spinner className='text-muted-foreground size-6 animate-spin' />
      </div>
    );
  }

  if (isError) {
    return (
      <SurvaiPanel>
        <SurvaiPanelBody className='space-y-3 py-10 text-center'>
          <p className='text-sm text-destructive'>
            {error instanceof Error ? error.message : 'Failed to load report'}
          </p>
          <Button variant='outline' onClick={() => void refetch()}>
            Retry
          </Button>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  if (!report) {
    return (
      <SurvaiPanel>
        <SurvaiPanelHeader
          icon={<Icons.report className='size-3.5' />}
          title='Generate report'
          subtitle='Create a grounded narrative from your analytics snapshot'
        />
        <SurvaiPanelBody className='flex flex-col items-center gap-4 py-10 text-center'>
          <p className='text-muted-foreground max-w-md text-sm'>
            Reports use only numbers from the stored metrics snapshot — no
            invented statistics. Publish and collect responses first.
          </p>
          <Button
            onClick={() => void handleGenerateReport()}
            disabled={isGenerating}
            className={cn(brandCtaClass, 'min-w-[12rem]')}
          >
            {isGenerating ? (
              <Icons.spinner className='mr-2 size-4 animate-spin' />
            ) : (
              <Icons.sparkles className='mr-2 size-4' />
            )}
            Generate Report
          </Button>
          <Link
            href={`/dashboard/surveys/${surveyId}/analytics`}
            className='text-muted-foreground text-xs underline-offset-4 hover:underline'
          >
            View analytics first
          </Link>
        </SurvaiPanelBody>
      </SurvaiPanel>
    );
  }

  const editingSection = activeSection
    ? sections.find((s) => s.id === activeSection)
    : null;
  const sectionDirty =
    !!editingSection &&
    !!draftSection &&
    (editingSection.title !== draftSection.title ||
      editingSection.content !== draftSection.content);

  return (
    <div className='space-y-5'>
      <div className='grid gap-6 lg:grid-cols-3'>
        <div className='space-y-4 lg:col-span-2'>
          <SurvaiPanel>
            <SurvaiPanelHeader
              icon={<Icons.report className='size-3.5' />}
              title={
                editingTitle ? (
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={(e) => setTitleDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSaveTitle();
                      }
                      if (e.key === 'Escape') {
                        setEditingTitle(false);
                        setTitleDraft(reportTitle);
                      }
                    }}
                    disabled={saving}
                    className='font-display h-9 max-w-xl text-base font-bold'
                    aria-label='Report title'
                  />
                ) : (
                  reportTitle || 'AI-Generated Report'
                )
              }
              subtitle='Grounded narrative from your survey metrics'
              badge={
                <Badge
                  variant='secondary'
                  className='rounded-full text-[10px]'
                >
                  {sections.length} sections
                </Badge>
              }
              actions={
                editingTitle ? (
                  <div className='flex items-center gap-1.5'>
                    <Button
                      size='sm'
                      className={cn(brandCtaClass, 'h-8 px-3 text-xs')}
                      disabled={saving}
                      onClick={() => void handleSaveTitle()}
                    >
                      {saving ? (
                        <Icons.spinner className='mr-1 size-3 animate-spin' />
                      ) : (
                        <Icons.check className='mr-1 size-3' />
                      )}
                      Save
                    </Button>
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-8 rounded-xl text-xs'
                      disabled={saving}
                      onClick={() => {
                        setEditingTitle(false);
                        setTitleDraft(reportTitle);
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    className='rounded-lg'
                    aria-label='Edit report title'
                    onClick={() => {
                      setTitleDraft(reportTitle);
                      setEditingTitle(true);
                    }}
                  >
                    <Icons.edit className='h-3.5 w-3.5' />
                  </Button>
                )
              }
            />
            <SurvaiPanelBody className='space-y-3'>
              <div className='text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-xs'>
                <span className='flex items-center gap-1.5'>
                  <Icons.calendar className='h-3.5 w-3.5' />
                  Generated {formatDate(report.createdAt)}
                </span>
                <span className='flex items-center gap-1.5'>
                  <Icons.sparkles className='h-3.5 w-3.5' />
                  {report.model ?? 'gemini'}
                </span>
                <span className='flex items-center gap-1.5 font-mono tabular-nums'>
                  <Icons.page className='h-3.5 w-3.5' />
                  {totalWords.toLocaleString()} words
                </span>
                <span className='flex items-center gap-1.5 font-mono tabular-nums'>
                  ver {report.surveyVersionId.slice(0, 8)}
                </span>
              </div>
              {!report.integrity.matchesCurrentVersion ? (
                <div
                  role='status'
                  className='rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2.5 text-xs leading-relaxed text-foreground'
                >
                  This report is pinned to a previous survey version. Analytics
                  and respondents use the current published version — regenerate
                  the report to stay aligned.
                </div>
              ) : report.integrity.isStale ? (
                <div
                  role='status'
                  className='rounded-xl border border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-soft/50 px-3 py-2.5 text-xs leading-relaxed text-foreground'
                >
                  New responses since this snapshot (
                  {report.integrity.snapshotResponseCount}
                  {report.integrity.liveResponseCount != null
                    ? ` → ${report.integrity.liveResponseCount}`
                    : ''}
                  ). Numbers in the text stay frozen to the original metrics —
                  regenerate for an up-to-date report.
                </div>
              ) : (
                <p className='text-muted-foreground text-[11px]'>
                  Grounded on the current published version metrics snapshot —
                  same scope as analytics and respondents.
                </p>
              )}
            </SurvaiPanelBody>
          </SurvaiPanel>

          {sections.map((section, index) => {
            const isEditing = activeSection === section.id;
            const isRegen = regeneratingId === section.id;
            return (
              <SurvaiPanel key={section.id}>
                <div className='flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <span className='flex size-6 shrink-0 items-center justify-center rounded-lg bg-foreground text-[11px] font-bold text-background'>
                      {index + 1}
                    </span>
                    {isEditing ? (
                      <Input
                        value={section.title}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === section.id
                                ? { ...s, title: e.target.value }
                                : s
                            )
                          )
                        }
                        disabled={saving}
                        className='font-display h-8 max-w-md text-sm font-bold'
                        aria-label='Section title'
                      />
                    ) : (
                      <h3 className='font-display truncate text-sm font-bold tracking-tight'>
                        {section.title}
                      </h3>
                    )}
                  </div>
                  <div className='flex shrink-0 items-center gap-1'>
                    <span className='text-muted-foreground mr-1 font-mono text-[11px] tabular-nums'>
                      {countWords(section.content).toLocaleString()} words
                    </span>
                    {!isEditing ? (
                      <>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          className='rounded-lg'
                          disabled={!!regeneratingId || isGenerating}
                          aria-label={`Regenerate ${section.title}`}
                          title='Regenerate with AI'
                          onClick={() =>
                            void handleRegenerateSection(section.id)
                          }
                        >
                          {isRegen ? (
                            <Icons.spinner className='h-3.5 w-3.5 animate-spin' />
                          ) : (
                            <Icons.sparkles className='h-3.5 w-3.5' />
                          )}
                        </Button>
                        <Button
                          variant='ghost'
                          size='icon-sm'
                          className='rounded-lg'
                          disabled={!!regeneratingId || isGenerating}
                          aria-label={`Edit ${section.title}`}
                          onClick={() => startEditSection(section)}
                        >
                          <Icons.edit className='h-3.5 w-3.5' />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <SurvaiPanelBody>
                  {isRegen ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-8 text-sm'>
                      <Icons.spinner className='size-4 animate-spin' />
                      Regenerating this section…
                    </div>
                  ) : isEditing ? (
                    <div className='space-y-3'>
                      <textarea
                        value={section.content}
                        aria-label={`Edit ${section.title}`}
                        disabled={saving}
                        onChange={(e) =>
                          setSections((prev) =>
                            prev.map((s) =>
                              s.id === section.id
                                ? { ...s, content: e.target.value }
                                : s
                            )
                          )
                        }
                        className='min-h-[280px] w-full resize-y rounded-xl border border-border bg-background px-3 py-2.5 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60'
                      />
                      <div className='flex flex-wrap items-center gap-2'>
                        <Button
                          size='sm'
                          className={cn(brandCtaClass, 'h-8 px-3 text-xs')}
                          disabled={saving || !sectionDirty}
                          onClick={() => void handleSaveSection()}
                        >
                          {saving ? (
                            <Icons.spinner className='mr-1 h-3 w-3 animate-spin' />
                          ) : (
                            <Icons.check className='mr-1 h-3 w-3' />
                          )}
                          Save section
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='rounded-xl'
                          disabled={saving}
                          onClick={cancelEditSection}
                        >
                          Cancel
                        </Button>
                        {sectionDirty ? (
                          <span className='text-muted-foreground text-[11px]'>
                            Unsaved changes
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ) : (
                    <div className='max-w-none space-y-1 text-sm leading-relaxed text-foreground/90'>
                      {renderSectionContent(section.content)}
                    </div>
                  )}
                </SurvaiPanelBody>
              </SurvaiPanel>
            );
          })}
        </div>

        <div className='sticky top-[4.5rem] self-start space-y-4'>
          <SurvaiPanel className='flex flex-col'>
            <div className='relative shrink-0 overflow-hidden border-b border-[color-mix(in_srgb,var(--brand)_70%,var(--foreground))] bg-brand px-4 py-4'>
              <div
                className='pointer-events-none absolute inset-0 opacity-35'
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
              <div className='relative flex items-start gap-3'>
                <div className='flex size-9 shrink-0 items-center justify-center rounded-xl bg-card text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_20%,transparent)]'>
                  <Icons.chat className='size-4' />
                </div>
                <div className='min-w-0 flex-1'>
                  <h3 className='font-display text-base font-extrabold tracking-tight text-foreground'>
                    Report Chat
                  </h3>
                  <p className='mt-0.5 text-xs leading-relaxed text-foreground/70'>
                    Ask questions grounded in the metrics snapshot
                  </p>
                </div>
              </div>
            </div>

            <div
              ref={messagesEndRef}
              aria-live='polite'
              className='flex min-h-[min(48vh,480px)] max-h-[min(64vh,640px)] flex-col gap-3 overflow-y-auto px-3.5 py-4'
              style={{
                backgroundImage: `
                  radial-gradient(ellipse 90% 45% at 50% 0%, color-mix(in srgb, var(--brand) 12%, transparent), transparent 70%),
                  radial-gradient(color-mix(in srgb, var(--foreground) 7%, transparent) 1px, transparent 1px)
                `,
                backgroundSize: 'auto, 16px 16px'
              }}
            >
              {chatMessages.length === 0 ? (
                <p className='text-muted-foreground px-1 text-sm'>
                  Ask about findings in the report. Answers stay grounded in
                  the snapshot.
                </p>
              ) : null}
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    'flex gap-2.5 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                    msg.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {msg.role === 'assistant' ? (
                    <div
                      className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                      aria-hidden
                    >
                      <Icons.sparkles className='size-3.5' />
                    </div>
                  ) : null}
                  <div
                    className={cn(
                      'max-w-[min(100%,18rem)] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'rounded-br-md bg-foreground text-background'
                        : 'rounded-bl-md border border-border bg-card/95 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {isReplying ? (
                <div
                  className='flex gap-2.5 animate-in fade-in duration-200'
                  aria-label='SurvAI is typing'
                >
                  <div
                    className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3.5' />
                  </div>
                  <div className='flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-border bg-card/95 px-4 py-3'>
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
                  </div>
                </div>
              ) : null}
            </div>

            <div className='shrink-0 space-y-3 border-t border-border bg-[color-mix(in_srgb,var(--background)_55%,var(--brand-soft))] px-3.5 py-3.5'>
              <div className='relative'>
                <Input
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={
                    isReplying ? 'SurvAI is typing…' : 'Ask about the report…'
                  }
                  disabled={isReplying}
                  className='border-border bg-card h-11 rounded-2xl border-2 pr-12 text-sm shadow-sm focus-visible:border-[color-mix(in_srgb,var(--brand)_65%,var(--foreground))] disabled:opacity-70'
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                />
                <Button
                  size='icon'
                  onClick={() => void handleSendMessage()}
                  disabled={!chatInput.trim() || isReplying}
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
          </SurvaiPanel>

          <SurvaiPanel>
            <SurvaiPanelBody className='space-y-3'>
              <Button
                onClick={() => void handleGenerateReport()}
                disabled={isGenerating || !!regeneratingId}
                className={cn(brandCtaClass, 'w-full')}
              >
                {isGenerating ? (
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                ) : (
                  <Icons.sparkles className='mr-2 size-4' />
                )}
                Regenerate full report
              </Button>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  variant='outline'
                  disabled={isExporting}
                  onClick={() => void handleExport('docx')}
                  className='h-10 rounded-xl'
                >
                  <Icons.fileTypeDoc className='mr-1.5 size-4' />
                  DOCX
                </Button>
                <Button
                  variant='outline'
                  disabled={isExporting}
                  onClick={() => void handleExport('pdf')}
                  className='h-10 rounded-xl'
                >
                  <Icons.fileTypePdf className='mr-1.5 size-4' />
                  PDF
                </Button>
              </div>

              <Separator />

              <div className='space-y-0.5'>
                <Link
                  href={`/dashboard/surveys/${surveyId}/analytics`}
                  className='group flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-muted/70'
                >
                  <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-foreground'>
                    <Icons.analytics className='size-4' />
                  </span>
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    View Analytics
                  </span>
                  <Icons.arrowRight className='text-muted-foreground size-4 transition-transform group-hover:translate-x-0.5' />
                </Link>
              </div>
            </SurvaiPanelBody>
          </SurvaiPanel>
        </div>
      </div>
    </div>
  );
}
