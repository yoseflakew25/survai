'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader,
  brandCtaClass,
  quietActionClass
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { reportChatOptions, reportKeys, reportOptions } from '../api/queries';
import {
  downloadExportPack,
  downloadReportDocx,
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
import { canEditOrg, useAuth } from '@/lib/auth-context';

const blackCtaClass =
  'h-11 w-full rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-4 text-sm font-semibold text-background shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_25%,transparent)] hover:bg-foreground/90 disabled:opacity-60';

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

export function ReportView({ surveyId }: ReportViewProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const deepReportId = searchParams.get('reportId');
  const savedAnalysisId = searchParams.get('savedAnalysisId');
  const { run, activeId } = useSurveyActivity();
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { data: report, isLoading, isError, error, refetch } = useQuery(
    reportOptions(surveyId, deepReportId)
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
      queryClient.setQueryData(
        reportKeys.detail(surveyId, deepReportId),
        next
      );
      queryClient.setQueryData(reportKeys.detail(surveyId, next.id), next);
      setSections(next.sections);
      setReportTitle(next.title);
    },
    [queryClient, surveyId, deepReportId]
  );

  const handleGenerateReport = useCallback(async () => {
    setActiveSection(null);
    setDraftSection(null);
    const activity = report ? 'regenerate-report' : 'generate-report';
    try {
      await run(activity, async () => {
        const next = await generateReport(
          surveyId,
          'internal',
          savedAnalysisId
        );
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
  }, [applyReport, queryClient, report, run, savedAnalysisId, surveyId]);

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
    if (!report || !canEdit) return;
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
  }, [report, canEdit]);

  const handleSaveDocx = useCallback(async () => {
    if (!report || !canEdit) return;
    setIsExporting(true);
    try {
      await downloadReportDocx(report.id, report.title);
      toast.success('Word saved', {
        description: 'Your report downloaded as a Word document.'
      });
    } catch (err) {
      toast.error('Word export failed', {
        description:
          err instanceof Error ? err.message : 'Could not save as Word.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [report, canEdit]);

  const handleDonorPack = useCallback(async () => {
    if (!report || !canEdit) return;
    setIsExporting(true);
    try {
      await downloadExportPack(report.id, report.title);
      toast.success('Donor pack ready', {
        description: 'ZIP with PDF, Word, and analytics CSV downloaded.'
      });
    } catch (err) {
      toast.error('Donor pack failed', {
        description:
          err instanceof Error ? err.message : 'Could not build the pack.'
      });
    } finally {
      setIsExporting(false);
    }
  }, [report, canEdit]);

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
      <div className='mx-auto max-w-xl'>
        <SurvaiPanel>
          <SurvaiPanelHeader
            className='border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary'
            title={
              <div className='min-w-0'>
                <h1 className='font-display text-xl font-extrabold tracking-tight text-primary-foreground sm:text-2xl'>
                  Generate report
                </h1>
                <p className='mt-1 text-sm leading-snug text-primary-foreground/80'>
                  Create a grounded narrative from your analytics snapshot
                </p>
              </div>
            }
          />
          <SurvaiPanelBody className='flex flex-col items-center gap-4 py-10 text-center'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
              <Icons.report className='size-5' />
            </div>
            <p className='text-muted-foreground max-w-md text-sm leading-relaxed'>
              Reports use only numbers from the stored metrics snapshot — no
              invented statistics. Publish and collect responses first.
            </p>
            <Button
              onClick={() => void handleGenerateReport()}
              disabled={isGenerating}
              className={cn(blackCtaClass, 'mt-1 h-10 w-auto min-w-[12rem] px-4')}
            >
              {isGenerating ? (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              ) : (
                <Icons.sparkles className='mr-2 size-4' />
              )}
              Generate report
            </Button>
            <Link
              href={`/dashboard/surveys/${surveyId}/analytics`}
              className='text-muted-foreground text-xs underline-offset-4 hover:underline'
            >
              View analytics first
            </Link>
          </SurvaiPanelBody>
        </SurvaiPanel>
      </div>
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
    <div className='grid gap-6 lg:-mt-1 lg:h-[calc(100dvh-10.75rem)] lg:min-h-0 lg:grid-cols-[minmax(0,1fr)_minmax(26rem,32rem)] lg:overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(28rem,36rem)]'>
      <div className='min-h-0 space-y-4 lg:overflow-y-auto lg:overscroll-contain lg:pr-1'>
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
          <SurvaiPanel>
            <SurvaiPanelHeader
              className='border-b border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-[color-mix(in_srgb,var(--brand)_22%,var(--brand-soft))]'
              title={
                <div className='min-w-0'>
                  {editingTitle ? (
                    <div className='flex flex-wrap items-center gap-2'>
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
                        className='font-display h-10 max-w-xl border-border bg-card text-base font-extrabold text-foreground'
                        aria-label='Report title'
                      />
                      <Button
                        size='sm'
                        className='h-8 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-3 text-xs font-semibold text-background hover:bg-foreground/90'
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
                        className='h-8 rounded-xl text-xs text-foreground hover:bg-muted'
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
                    <div className='flex items-start gap-2'>
                      <h1 className='font-display min-w-0 flex-1 text-xl font-extrabold tracking-tight text-foreground sm:text-2xl'>
                        {reportTitle || 'AI-generated report'}
                      </h1>
                      {canEdit ? (
                        <Button
                          type='button'
                          size='sm'
                          className='mt-0.5 h-9 shrink-0 gap-2 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-3 text-sm font-semibold text-background hover:bg-foreground/90'
                          onClick={() => {
                            setTitleDraft(reportTitle);
                            setEditingTitle(true);
                          }}
                        >
                          <Icons.edit className='size-4' strokeWidth={2.25} />
                          Edit title
                        </Button>
                      ) : null}
                    </div>
                  )}
                  <div className='text-muted-foreground mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] leading-none'>
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-background/55 px-2 py-1 ring-1 ring-border/50'>
                      <Icons.calendar className='size-3 shrink-0 opacity-70' />
                      {formatDate(report.createdAt)}
                    </span>
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-background/55 px-2 py-1 ring-1 ring-border/50'>
                      <Icons.sparkles className='size-3 shrink-0 opacity-70' />
                      {report.model ?? 'gemini'}
                    </span>
                    <span className='inline-flex items-center rounded-lg bg-background/55 px-2 py-1 font-mono tabular-nums ring-1 ring-border/50'>
                      ver {report.surveyVersionId.slice(0, 8)}
                    </span>
                    <span className='inline-flex items-center gap-1.5 rounded-lg bg-background/55 px-2 py-1 ring-1 ring-border/50'>
                      <Icons.page className='size-3 shrink-0 opacity-70' />
                      {totalWords.toLocaleString()} words · {sections.length}{' '}
                      sections
                    </span>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg px-2 py-1 ring-1',
                        isStale
                          ? 'bg-amber-500/10 text-amber-800 ring-amber-500/25 dark:text-amber-300'
                          : 'bg-background/55 ring-border/50'
                      )}
                    >
                      {isStale ? (
                        <Icons.warning className='size-3 shrink-0' />
                      ) : (
                        <Icons.check
                          className='size-3 shrink-0 opacity-70'
                          strokeWidth={2.5}
                        />
                      )}
                      {isStale ? 'Stale snapshot' : 'Snapshot current'}
                    </span>
                  </div>
                </div>
              }
            />
            <SurvaiPanelBody>
              <div
                className={cn(
                  'grid gap-2.5',
                  canEdit
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-3'
                )}
              >
                <Button
                  type='button'
                  disabled={isExporting || !report}
                  onClick={() => void handleSavePdf()}
                  className={cn(
                    blackCtaClass,
                    'h-10 w-full gap-2 shadow-[0_2px_0_color-mix(in_srgb,var(--foreground)_35%,transparent)]'
                  )}
                >
                  {isExporting ? (
                    <Icons.spinner className='size-3.5 animate-spin' />
                  ) : (
                    <Icons.fileTypePdf className='size-3.5' />
                  )}
                  Save as PDF
                </Button>
                <Button
                  type='button'
                  disabled={isExporting || !report}
                  onClick={() => void handleSaveDocx()}
                  className={cn(brandCtaClass, 'h-10 w-full gap-2 px-4 shadow-sm')}
                >
                  <Icons.page className='size-3.5' />
                  Save as Word
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isExporting || !report}
                  onClick={() => void handleDonorPack()}
                  className='h-10 w-full gap-2 rounded-xl border-2 border-foreground/85 bg-transparent px-4 text-sm font-semibold text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_12%,transparent)] hover:bg-foreground hover:text-background'
                >
                  <Icons.fileZip className='size-3.5' />
                  Download donor pack
                </Button>
                {canEdit ? (
                  <Button
                    type='button'
                    variant='outline'
                    disabled={isGenerating || !!regeneratingId}
                    onClick={() => void handleGenerateReport()}
                    className='h-10 w-full gap-2 rounded-xl border-2 border-primary bg-brand-soft px-4 text-sm font-semibold text-primary shadow-sm hover:bg-primary hover:text-primary-foreground'
                  >
                    {isGenerating ? (
                      <Icons.spinner className='size-3.5 animate-spin' />
                    ) : (
                      <Icons.sparkles className='size-3.5' />
                    )}
                    Regenerate report
                  </Button>
                ) : null}
              </div>
            </SurvaiPanelBody>
          </SurvaiPanel>

          {sections.map((section, index) => {
            const isEditing = activeSection === section.id;
            const isRegen = regeneratingId === section.id;
            return (
              <SurvaiPanel key={section.id}>
                <div className='flex items-center justify-between gap-3 border-b border-border bg-brand-soft px-4 py-3.5 sm:px-5'>
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <span className='flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary font-display text-sm font-extrabold tabular-nums text-primary-foreground shadow-sm'>
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
                      <h3 className='font-display truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg'>
                        {section.title}
                      </h3>
                    )}
                  </div>
                  <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                      {countWords(section.content).toLocaleString()} words
                    </span>
                    {!isEditing ? (
                      <>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          disabled={!!regeneratingId || isGenerating}
                          className='h-8 gap-1.5 rounded-xl border-2 border-primary bg-card px-2.5 text-xs font-semibold text-primary hover:bg-primary hover:text-primary-foreground'
                          onClick={() =>
                            void handleRegenerateSection(section.id)
                          }
                        >
                          {isRegen ? (
                            <Icons.spinner className='size-3.5 animate-spin' />
                          ) : (
                            <Icons.sparkles className='size-3.5' />
                          )}
                          Regenerate
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          disabled={!!regeneratingId || isGenerating}
                          className='h-8 gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--foreground)_22%,transparent)] bg-foreground px-2.5 text-xs font-semibold text-background hover:bg-foreground/90'
                          onClick={() => startEditSection(section)}
                        >
                          <Icons.edit className='size-3.5' strokeWidth={2.25} />
                          Edit
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
                          className={cn(quietActionClass, 'h-8 px-3 text-xs')}
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
                    <div className='max-w-none space-y-1 text-[0.95rem] leading-relaxed text-foreground'>
                      {renderSectionContent(section.content)}
                    </div>
                  )}
                </SurvaiPanelBody>
              </SurvaiPanel>
            );
          })}
        </div>

        <div className='flex min-h-0 flex-col lg:h-full'>
          <SurvaiPanel className='flex min-h-0 flex-1 flex-col h-[70vh] lg:h-full'>
            <div className='shrink-0 border-b border-[color-mix(in_srgb,var(--primary)_70%,var(--foreground))] bg-primary px-4 py-4'>
              <h3 className='font-display text-2xl  font-extrabold tracking-tight text-primary-foreground'>
                Chat with the report
              </h3>
              <p className='mt-0.5 text-xs leading-relaxed text-primary-foreground/80'>
                Ask about findings, donors, or next steps — answers stay
                grounded in the metrics snapshot.
              </p>
            </div>

            <div
              ref={messagesEndRef}
              aria-live='polite'
              className='min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-3.5 py-4'
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
                        className='rounded-full border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-card px-2.5 py-1 text-left text-[11px] font-medium text-foreground transition-colors hover:bg-muted/50'
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
                        className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                        aria-hidden
                      >
                        <Icons.sparkles className='size-3.5' />
                      </div>
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[min(100%,26rem)] space-y-2 rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
                        msg.role === 'user'
                          ? 'rounded-br-md bg-foreground text-background'
                          : 'rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft text-foreground shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_5%,transparent)]'
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
                                  'bg-muted text-muted-foreground',
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
                    className='mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--brand)_55%,var(--border))] bg-brand-soft text-primary shadow-[0_1px_0_color-mix(in_srgb,var(--foreground)_6%,transparent)]'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3.5' />
                  </div>
                  <div className='flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[color-mix(in_srgb,var(--brand)_28%,var(--border))] bg-brand-soft px-4 py-3'>
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

            <div className='shrink-0 space-y-3 border-t border-border bg-brand-soft/70 px-3.5 py-3.5'>
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
  );
}
