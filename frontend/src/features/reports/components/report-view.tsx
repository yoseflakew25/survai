'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  downloadReportPdf,
  generateReport,
  regenerateReportSection,
  sendReportChat,
  updateReport
} from '../api/service';
import type {
  ChatConfidence,
  ReportChatMessage,
  ReportSection,
  SurveyReport
} from '../api/types';
import { useSurveyActivity } from '@/features/surveys/components/survey-activity-provider';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';

const CHAT_STARTERS = [
  'What are the top findings?',
  'Summarize this for a donor brief',
  'What should we do next?',
  'Any limitations I should mention?'
] as const;

function confidenceLabel(c: ChatConfidence | null): string | null {
  if (c === 'grounded') return 'Grounded';
  if (c === 'partial') return 'Partial';
  if (c === 'insufficient_data') return 'Insufficient data';
  return null;
}

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
  const { run, activeId } = useSurveyActivity();
  const { data: report, isLoading, isError, error, refetch } = useQuery(
    reportOptions(surveyId)
  );
  const [sections, setSections] = useState<ReportSection[]>([]);
  const [reportTitle, setReportTitle] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [draftSection, setDraftSection] = useState<ReportSection | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const isGenerating =
    activeId === 'generate-report' || activeId === 'regenerate-report';
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
    setActiveSection(null);
    setDraftSection(null);
    const activity = report ? 'regenerate-report' : 'generate-report';
    try {
      await run(activity, async () => {
        const next = await generateReport(surveyId);
        applyReport(next);
        await queryClient.invalidateQueries({
          queryKey: reportKeys.chat(next.id)
        });
      });
      toast.success(report ? 'Report regenerated' : 'Report generated', {
        description: report
          ? 'Rewrote the full report from the latest metrics snapshot.'
          : 'AI drafted a grounded report from your metrics snapshot.'
      });
    } catch (err) {
      toast.error('Generation failed', {
        description:
          err instanceof Error
            ? err.message
            : 'Could not generate the report. Please try again.'
      });
    }
  }, [applyReport, queryClient, report, run, surveyId]);

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
        await run('regenerate-section', async () => {
          const next = await regenerateReportSection(report.id, sectionId);
          applyReport(next);
        });
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
    [activeSection, applyReport, draftSection, report, run, sections]
  );

  const handleSendMessage = useCallback(
    async (override?: string) => {
      const message = (override ?? chatInput).trim();
      if (!message || isReplying || !report) return;
      setChatInput('');
      setIsReplying(true);

      const optimistic: ReportChatMessage = {
        id: `optimistic-${Date.now()}`,
        role: 'user',
        content: message,
        metricRefs: [],
        confidence: null,
        createdAt: new Date().toISOString()
      };
      const previous =
        queryClient.getQueryData<ReportChatMessage[]>(
          reportKeys.chat(report.id)
        ) ?? [];
      queryClient.setQueryData(reportKeys.chat(report.id), [
        ...previous,
        optimistic
      ]);

      try {
        const messages = await sendReportChat(report.id, message);
        queryClient.setQueryData(reportKeys.chat(report.id), messages);
      } catch (err) {
        queryClient.setQueryData(reportKeys.chat(report.id), previous);
        setChatInput(message);
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

  const handleSavePdf = useCallback(async () => {
    if (!report) return;
    setIsExporting(true);
    try {
      await downloadReportPdf(report.id, report.title);
      toast.success('PDF saved', {
        description: 'Your report downloaded as a PDF.'
      });
    } catch (err) {
      toast.error('PDF export failed', {
        description:
          err instanceof Error ? err.message : 'Could not save as PDF.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [report]);

  if (isLoading) {
    return <SurveyActivityFallback activity='fetch-report' />;
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

  const isStale = report.integrity.isStale;
  const snapshotCount = report.integrity.snapshotResponseCount;
  const liveCount = report.integrity.liveResponseCount;

  return (
    <div className='space-y-5'>
      {isStale ? (
        <div
          className='flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'
          role='status'
        >
          <div className='flex min-w-0 items-start gap-2.5'>
            <Icons.warning className='mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400' />
            <div className='min-w-0'>
              <p className='text-sm font-semibold tracking-tight'>
                Report snapshot is stale
              </p>
              <p className='text-muted-foreground mt-0.5 text-xs leading-relaxed'>
                New responses arrived after this report was generated
                {liveCount != null
                  ? ` (${snapshotCount} → ${liveCount} responses)`
                  : ''}
                . Numbers in the narrative still match the frozen metrics —
                regenerate to refresh from the latest analytics.
              </p>
            </div>
          </div>
          <Button
            size='sm'
            className={cn(brandCtaClass, 'h-9 shrink-0 px-3 text-xs')}
            disabled={isGenerating || !!regeneratingId}
            onClick={() => void handleGenerateReport()}
          >
            {isGenerating ? (
              <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
            ) : (
              <Icons.sparkles className='mr-1.5 size-3.5' />
            )}
            Regenerate from latest
          </Button>
        </div>
      ) : null}

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
              // subtitle='Grounded narrative from your survey metrics'
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
                  <>
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
                  </>
                ) : (
                  <>
                    <Button
                      size='sm'
                      disabled={isExporting || !report}
                      onClick={() => void handleSavePdf()}
                      className={cn(brandCtaClass, 'h-8 px-3 text-xs')}
                    >
                      {isExporting ? (
                        <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                      ) : (
                        <Icons.fileTypePdf className='mr-1.5 size-3.5' />
                      )}
                      save as pdf
                    </Button>
                    <Button
                      size='sm'
                      disabled={isGenerating || !!regeneratingId}
                      onClick={() => void handleGenerateReport()}
                      className='h-8 rounded-xl bg-black px-3 text-xs text-white hover:bg-black/90 hover:text-white'
                    >
                      {isGenerating ? (
                        <Icons.spinner className='mr-1.5 size-3.5 animate-spin' />
                      ) : (
                        <Icons.sparkles className='mr-1.5 size-3.5' />
                      )}
                      regenerate
                    </Button>
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
                  </>
                )
              }
            />
            <SurvaiPanelBody>
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
               
                <div className='min-w-0 flex-1'>
                  <h3 className='font-display text-xl font-extrabold tracking-tight text-foreground'>
                    Chat with the report
                  </h3>
                  <p className='mt-0.5 text-xs leading-relaxed text-foreground/70'>
                    Ask questions and chat with the report for better insights.
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
              {chatMessages.length === 0 && !isReplying ? (
                <div className='space-y-3 px-1'>
                  <p className='text-muted-foreground text-sm leading-relaxed'>
                    Ask about findings, donors, or next steps. Answers stay
                    grounded in the metrics snapshot.
                  </p>
                  <div className='flex flex-wrap gap-1.5'>
                    {CHAT_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        type='button'
                        disabled={isReplying}
                        onClick={() => void handleSendMessage(starter)}
                        className='rounded-full border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-brand-soft'
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {chatMessages.map((msg) => {
                const conf = confidenceLabel(msg.confidence);
                return (
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
                        'max-w-[min(100%,18rem)] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'rounded-br-md bg-foreground text-background'
                          : 'rounded-bl-md border border-border bg-card/95 text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
                      )}
                    >
                      <p className='whitespace-pre-wrap break-words'>
                        {msg.content}
                      </p>
                      {msg.role === 'assistant' &&
                      (conf || msg.metricRefs.length > 0) ? (
                        <div className='flex flex-wrap items-center gap-1.5 border-t border-border/70 pt-2'>
                          {conf ? (
                            <span
                              className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide uppercase',
                                msg.confidence === 'grounded' &&
                                  'bg-brand-soft text-foreground',
                                msg.confidence === 'partial' &&
                                  'bg-muted text-foreground/80',
                                msg.confidence === 'insufficient_data' &&
                                  'bg-destructive/10 text-destructive'
                              )}
                            >
                              {conf}
                            </span>
                          ) : null}
                          {msg.metricRefs.slice(0, 4).map((ref) => (
                            <span
                              key={ref}
                              className='inline-flex max-w-full truncate rounded-full border border-border bg-background/80 px-2 py-0.5 font-mono text-[10px] text-muted-foreground'
                              title={ref}
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
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
        </div>
      </div>
    </div>
  );
}
