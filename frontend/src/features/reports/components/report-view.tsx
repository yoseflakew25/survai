'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader,
  brandCtaClass,
  compactCtaClass,
  panelHeaderToneClass,
  primaryCtaClass,
  brandMetaChipClass,
  onBrandControlClass,
  planFieldControlClass,
  quietActionClass,
  sectionIndexClass,
  softActionClass
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
import { useLocale, useTranslations } from 'next-intl';

const CHAT_STARTER_KEYS = ['starter1', 'starter2', 'starter3', 'starter4'] as const;

function confidenceKey(c: ChatConfidence | null): string | null {
  if (c === 'grounded') return 'confidenceGrounded';
  if (c === 'partial') return 'confidencePartial';
  if (c === 'insufficient_data') return 'confidenceInsufficient';
  return null;
}

const METRIC_REF_LABELS: Record<string, string> = {
  completion_rate: 'Completion rate',
  total_responses: 'Total responses',
  response_count: 'Response count'
};

function formatMetricRef(ref: string): string {
  const normalized = ref.trim().toLowerCase();
  if (METRIC_REF_LABELS[normalized]) return METRIC_REF_LABELS[normalized];
  const qMatch = ref.match(/^q_[a-f0-9]+_(.+)$/i);
  if (qMatch) {
    const tail = qMatch[1].replace(/_/g, ' ');
    return tail.length > 28 ? `${tail.slice(0, 26)}…` : tail;
  }
  const human = ref.replace(/_/g, ' ');
  return human.length > 32 ? `${human.slice(0, 30)}…` : human;
}

function confidenceBadgeVariant(
  c: ChatConfidence | null
): 'soft' | 'meta' | 'destructive' | 'outline' {
  if (c === 'grounded') return 'soft';
  if (c === 'partial') return 'meta';
  if (c === 'insufficient_data') return 'destructive';
  return 'outline';
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

function formatDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale === 'en' ? 'en-US' : locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

export function ReportView({ surveyId }: ReportViewProps) {
  const t = useTranslations('reports');
  const tCommon = useTranslations('common');
  const locale = useLocale();
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
      toast.success(report ? t('reportRegenerated') : t('reportGenerated'), {
        description: report ? t('regeneratedDesc') : t('generatedDesc')
      });
    } catch (err) {
      toast.error(t('generationFailed'), {
        description:
          err instanceof Error ? err.message : t('generationFailedDesc')
      });
    }
  }, [applyReport, queryClient, report, run, savedAnalysisId, surveyId, t]);

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
      toast.error(t('titleRequired'), {
        description: t('sectionTitleRequiredDesc')
      });
      return;
    }
    if (!section.content.trim()) {
      toast.error(t('sectionEmpty'), {
        description: t('sectionEmptyDesc')
      });
      return;
    }
    setSaving(true);
    try {
      const next = await updateReport(report.id, { sections });
      applyReport(next);
      setActiveSection(null);
      setDraftSection(null);
      toast.success(t('sectionSaved'));
    } catch (err) {
      toast.error(t('saveFailed'), {
        description:
          err instanceof Error ? err.message : t('sectionSaveFailedDesc')
      });
    } finally {
      setSaving(false);
    }
  }, [activeSection, applyReport, report, sections, t]);

  const handleSaveTitle = useCallback(async () => {
    if (!report) return;
    const nextTitle = titleDraft.trim();
    if (!nextTitle) {
      toast.error(t('titleRequired'));
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
      toast.success(t('titleUpdated'));
    } catch (err) {
      toast.error(t('saveFailed'), {
        description: err instanceof Error ? err.message : t('titleSaveFailedDesc')
      });
    } finally {
      setSaving(false);
    }
  }, [applyReport, report, titleDraft, t]);

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
        toast.success(t('sectionRegenerated'), {
          description: t('sectionRegeneratedDesc')
        });
      } catch (err) {
        toast.error(t('regenerateFailed'), {
          description:
            err instanceof Error ? err.message : t('regenerateFailedDesc')
        });
      } finally {
        setRegeneratingId(null);
      }
    },
    [activeSection, applyReport, draftSection, report, run, sections, t]
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
        toast.error(t('chatFailed'), {
          description: err instanceof Error ? err.message : t('chatFailedDesc')
        });
      } finally {
        setIsReplying(false);
      }
    },
    [chatInput, isReplying, queryClient, report, t]
  );

  const handleSavePdf = useCallback(async () => {
    if (!report || !canEdit) return;
    setIsExporting(true);
    try {
      await downloadReportPdf(report.id, report.title);
      toast.success(t('pdfSaved'), {
        description: t('pdfSavedDesc')
      });
    } catch (err) {
      toast.error(t('pdfExportFailed'), {
        description: err instanceof Error ? err.message : t('pdfExportFailedDesc')
      });
    } finally {
      setIsExporting(false);
    }
  }, [report, canEdit, t]);

  const handleSaveDocx = useCallback(async () => {
    if (!report || !canEdit) return;
    setIsExporting(true);
    try {
      await downloadReportDocx(report.id, report.title);
      toast.success(t('wordSaved'), {
        description: t('wordSavedDesc')
      });
    } catch (err) {
      toast.error(t('wordExportFailed'), {
        description:
          err instanceof Error ? err.message : t('wordExportFailedDesc')
      });
    } finally {
      setIsExporting(false);
    }
  }, [report, canEdit, t]);

  const handleDonorPack = useCallback(async () => {
    if (!report || !canEdit) return;
    setIsExporting(true);
    try {
      await downloadExportPack(report.id, report.title);
      toast.success(t('donorReady'), {
        description: t('donorReadyDesc')
      });
    } catch (err) {
      toast.error(t('donorPackFailed'), {
        description: err instanceof Error ? err.message : t('donorPackFailedDesc')
      });
    } finally {
      setIsExporting(false);
    }
  }, [report, canEdit, t]);

  if (isLoading) {
    return <SurveyActivityFallback activity='fetch-report' />;
  }

  if (isError) {
    return (
      <SurvaiPanel>
        <SurvaiPanelBody className='space-y-3 py-10 text-center'>
          <p className='text-sm text-destructive'>
            {error instanceof Error ? error.message : t('loadFailed')}
          </p>
          <Button variant='outline' onClick={() => void refetch()}>
            {tCommon('retry')}
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
            tone='brand'
            title={
              <div className='min-w-0'>
                <h1 className='font-display text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                  {t('generateTitle')}
                </h1>
                <p className='mt-1 text-sm leading-snug text-brand-foreground/70'>
                  {t('generateSubtitle')}
                </p>
              </div>
            }
          />
          <SurvaiPanelBody className='flex flex-col items-center gap-4 py-10 text-center'>
            <div className='flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm'>
              <Icons.report className='size-5' />
            </div>
            <p className='text-muted-foreground max-w-md text-sm leading-relaxed'>
              {t('generateBody')}
            </p>
            <Button
              onClick={() => void handleGenerateReport()}
              disabled={isGenerating}
              className={cn(brandCtaClass, 'mt-1 h-10 w-auto min-w-[12rem] px-4')}
            >
              {isGenerating ? (
                <Icons.spinner className='mr-2 size-4 animate-spin' />
              ) : (
                <Icons.sparkles className='mr-2 size-4' />
              )}
              {t('generateReport')}
            </Button>
            <Link
              href={`/dashboard/surveys/${surveyId}/analytics`}
              className='text-muted-foreground text-xs underline-offset-4 hover:underline'
            >
              {t('viewAnalyticsFirst')}
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
              <Icons.warning className=' size-4 shrink-0 text-amber-700 dark:text-amber-400' />
              <div className='min-w-0'>
                <p className='text-sm font-semibold tracking-tight'>
                  {t('staleTitle')}
                </p>
                <p className='text-muted-foreground  text-xs leading-relaxed'>
                  {liveCount != null
                    ? t('staleBodyCounts', {
                        snapshot: snapshotCount,
                        live: liveCount
                      })
                    : t('staleBody')}
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
              {t('regenerateFromLatest')}
            </Button>
          </div>
        ) : null}
          <SurvaiPanel>
            <SurvaiPanelHeader
              tone='brand'
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
                        className={cn(
                          onBrandControlClass,
                          'font-display h-10 max-w-xl text-base font-extrabold placeholder:text-brand-foreground/45'
                        )}
                        aria-label={t('reportTitle')}
                      />
                      <Button
                        size='sm'
                        className={cn(compactCtaClass, 'rounded-xl')}
                        disabled={saving}
                        onClick={() => void handleSaveTitle()}
                      >
                        {saving ? (
                          <Icons.spinner className='mr-1 size-3 animate-spin' />
                        ) : (
                          <Icons.check className='mr-1 size-3' />
                        )}
                        {tCommon('save')}
                      </Button>
                      <Button
                        size='sm'
                        variant='ghost'
                        className='h-8 rounded-xl text-xs text-brand-foreground/75 hover:bg-primary/10 hover:text-brand-foreground'
                        disabled={saving}
                        onClick={() => {
                          setEditingTitle(false);
                          setTitleDraft(reportTitle);
                        }}
                      >
                        {tCommon('cancel')}
                      </Button>
                    </div>
                  ) : (
                    <div className='flex items-start gap-2'>
                      <h1 className='font-display min-w-0 flex-1 text-xl font-extrabold tracking-tight text-brand-foreground sm:text-2xl'>
                        {reportTitle || t('fallbackTitle')}
                      </h1>
                      {canEdit ? (
                        <Button
                          type='button'
                          size='sm'
                          className={cn(brandCtaClass, 'h-8 shrink-0 gap-2 px-3 text-xs')}
                          onClick={() => {
                            setTitleDraft(reportTitle);
                            setEditingTitle(true);
                          }}
                        >
                          <Icons.edit className='size-3.5' strokeWidth={2.25} />
                          {t('editTitle')}
                        </Button>
                      ) : null}
                    </div>
                  )}
                  <div className='mt-2.5 flex flex-wrap items-center gap-1.5 leading-none'>
                    <span className={brandMetaChipClass}>
                      <Icons.calendar className='size-3 shrink-0 opacity-80' />
                      {formatDate(report.createdAt, locale)}
                    </span>
                    <span className={brandMetaChipClass}>
                      <Icons.sparkles className='size-3 shrink-0 opacity-80' />
                      {report.model ?? 'gemini'}
                    </span>
                    <span
                      className={cn(brandMetaChipClass, 'font-mono tabular-nums')}
                    >
                      {t('versionChip', {
                        id: report.surveyVersionId.slice(0, 8)
                      })}
                    </span>
                    <span className={brandMetaChipClass}>
                      <Icons.page className='size-3 shrink-0 opacity-80' />
                      {t('wordSectionCount', {
                        words: totalWords.toLocaleString(),
                        sections: sections.length
                      })}
                    </span>
                    <span
                      className={cn(
                        brandMetaChipClass,
                        isStale &&
                          'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                      )}
                    >
                      {isStale ? (
                        <Icons.warning className='size-3 shrink-0' />
                      ) : (
                        <Icons.check
                          className='size-3 shrink-0 opacity-80'
                          strokeWidth={2.5}
                        />
                      )}
                      {isStale ? t('staleSnapshot') : t('snapshotCurrent')}
                    </span>
                  </div>
                </div>
              }
            />
            <SurvaiPanelBody className='py-3.5'>
              <div
                className={cn(
                  'grid gap-2',
                  canEdit
                    ? 'grid-cols-1 sm:grid-cols-2 xl:grid-cols-4'
                    : 'grid-cols-1 sm:grid-cols-3'
                )}
              >
                <Button
                  type='button'
                  disabled={isExporting || !report}
                  onClick={() => void handleSavePdf()}
                  className={cn(primaryCtaClass, 'h-8 w-full gap-1.5 px-3 text-xs font-medium')}
                >
                  {isExporting ? (
                    <Icons.spinner className='size-3 animate-spin' />
                  ) : (
                    <Icons.fileTypePdf className='size-3' />
                  )}
                  {t('exportPdf')}
                </Button>
                <Button
                  type='button'
                  disabled={isExporting || !report}
                  onClick={() => void handleSaveDocx()}
                  className={cn(compactCtaClass, 'w-full')}
                >
                  <Icons.page className='size-3' />
                  {t('exportDocx')}
                </Button>
                <Button
                  type='button'
                  variant='outline'
                  disabled={isExporting || !report}
                  onClick={() => void handleDonorPack()}
                  className={cn(quietActionClass, 'w-full')}
                >
                  <Icons.fileZip className='size-3' />
                  {t('donorPack')}
                </Button>
                {canEdit ? (
                  <Button
                    type='button'
                    variant='outline'
                    disabled={isGenerating || !!regeneratingId}
                    onClick={() => void handleGenerateReport()}
                    className={cn(softActionClass, 'w-full')}
                  >
                    {isGenerating ? (
                      <Icons.spinner className='size-3 animate-spin' />
                    ) : (
                      <Icons.sparkles className='size-3' />
                    )}
                    {t('regenerateReport')}
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
                <div
                  className={cn(
                    panelHeaderToneClass.soft,
                    'flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5'
                  )}
                >
                  <div className='flex min-w-0 items-center gap-2.5'>
                    <span className={cn(sectionIndexClass, 'size-8 rounded-xl font-display text-sm')}>
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
                        className='font-display h-8 max-w-md border-border bg-card text-sm font-bold text-foreground'
                        aria-label={t('sectionTitle')}
                      />
                    ) : (
                      <h3 className='font-display truncate text-base font-extrabold tracking-tight text-foreground sm:text-lg'>
                        {section.title}
                      </h3>
                    )}
                  </div>
                  <div className='flex shrink-0 flex-wrap items-center gap-2'>
                    <span className='text-muted-foreground font-mono text-[11px] tabular-nums'>
                      {t('sectionWords', {
                        count: countWords(section.content).toLocaleString()
                      })}
                    </span>
                    {!isEditing ? (
                      <>
                        <Button
                          type='button'
                          size='sm'
                          variant='outline'
                          disabled={!!regeneratingId || isGenerating}
                          className={cn(quietActionClass, 'rounded-xl')}
                          onClick={() =>
                            void handleRegenerateSection(section.id)
                          }
                        >
                          {isRegen ? (
                            <Icons.spinner className='size-3.5 animate-spin' />
                          ) : (
                            <Icons.sparkles className='size-3.5' />
                          )}
                          {t('regenerate')}
                        </Button>
                        <Button
                          type='button'
                          size='sm'
                          disabled={!!regeneratingId || isGenerating}
                          className={cn(compactCtaClass, 'rounded-xl')}
                          onClick={() => startEditSection(section)}
                        >
                          <Icons.edit className='size-3.5' strokeWidth={2.25} />
                          {tCommon('edit')}
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
                <SurvaiPanelBody>
                  {isRegen ? (
                    <div className='text-muted-foreground flex items-center gap-2 py-8 text-sm'>
                      <Icons.spinner className='size-4 animate-spin' />
                      {t('regeneratingSection')}
                    </div>
                  ) : isEditing ? (
                    <div className='space-y-3'>
                      <textarea
                        value={section.content}
                        aria-label={t('editSectionAria', { title: section.title })}
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
                          {t('saveSection')}
                        </Button>
                        <Button
                          size='sm'
                          variant='ghost'
                          className='rounded-xl'
                          disabled={saving}
                          onClick={cancelEditSection}
                        >
                          {tCommon('cancel')}
                        </Button>
                        {sectionDirty ? (
                          <span className='text-muted-foreground text-[11px]'>
                            {tCommon('unsavedChanges')}
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
          <SurvaiPanel className='flex h-[70vh] min-h-0 flex-1 flex-col lg:h-full'>
            <SurvaiPanelHeader
              tone='soft'
              className='py-3'
              // icon={<Icons.chat className='size-3.5' />}
              title={t('chatTitle')}
              subtitle={t('chatSubtitle')}
            />

            <div
              ref={messagesEndRef}
              aria-live='polite'
              className='min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain border-t border-border bg-muted/15 px-3 py-3'
            >
              {chatMessages.length === 0 && !isReplying ? (
                <div className='space-y-2.5'>
                  <p className='text-muted-foreground text-sm leading-snug'>
                    {t('chatEmpty')}
                  </p>
                  <div className='flex flex-wrap gap-1.5'>
                    {CHAT_STARTER_KEYS.map((key) => (
                      <button
                        key={key}
                        type='button'
                        disabled={isReplying}
                        onClick={() => void handleSendMessage(t(key))}
                        className='rounded-none border border-border bg-card px-2.5 py-1.5 text-left text-xs font-medium text-foreground transition-colors hover:bg-muted/50'
                      >
                        {t(key)}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              {chatMessages.map((msg) => {
                const confKey = confidenceKey(msg.confidence);
                const conf = confKey ? t(confKey) : null;
                const metricRefs = msg.metricRefs.slice(0, 6);
                const extraMetrics = msg.metricRefs.length - metricRefs.length;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex gap-2 animate-in fade-in slide-in-from-bottom-1 duration-300 fill-mode-both',
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {msg.role === 'assistant' ? (
                      <span
                        className='flex size-7 shrink-0 items-center justify-center rounded-none border border-foreground/15 bg-primary text-primary-foreground'
                        aria-hidden
                      >
                        <Icons.sparkles className='size-3' />
                      </span>
                    ) : null}
                    <div
                      className={cn(
                        'max-w-[min(100%,100%)] space-y-1.5 text-sm leading-snug',
                        msg.role === 'user'
                          ? 'rounded-none border border-foreground/15 bg-foreground px-3 py-2 text-background'
                          : 'min-w-0 flex-1 rounded-none border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-[color-mix(in_srgb,var(--brand)_22%,var(--background))] px-3 py-2 text-foreground'
                      )}
                    >
                      <p className='whitespace-pre-wrap break-words'>{msg.content}</p>
                      {msg.role === 'assistant' &&
                      (conf || metricRefs.length > 0) ? (
                        <div className='flex flex-wrap items-center gap-1 border-t border-border/80 pt-1.5'>
                          {conf ? (
                            <Badge
                              variant={confidenceBadgeVariant(msg.confidence)}
                              className='h-6 px-2 text-[10px]'
                            >
                              {conf}
                            </Badge>
                          ) : null}
                          {metricRefs.map((ref) => (
                            <Badge
                              key={ref}
                              variant='meta'
                              className='h-6 max-w-[11rem] truncate px-2 text-[10px] normal-case'
                              title={ref}
                            >
                              {formatMetricRef(ref)}
                            </Badge>
                          ))}
                          {extraMetrics > 0 ? (
                            <span className='text-muted-foreground text-[10px] font-medium tabular-nums'>
                              +{extraMetrics}
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
              {isReplying ? (
                <div
                  className='flex gap-2 animate-in fade-in duration-200'
                  aria-label={t('typingAria')}
                >
                  <div
                    className='flex size-7 shrink-0 items-center justify-center rounded-none border border-foreground/15 bg-primary text-primary-foreground'
                    aria-hidden
                  >
                    <Icons.sparkles className='size-3' />
                  </div>
                  <div className='flex items-center gap-1.5 rounded-none border border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] bg-[color-mix(in_srgb,var(--brand)_22%,var(--background))] px-3 py-2'>
                    {[0, 1, 2].map((dot) => (
                      <span
                        key={dot}
                        className='size-1.5 animate-bounce rounded-full bg-muted-foreground/50'
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

            <div className='relative shrink-0 border-t border-border bg-background px-3 py-2.5'>
              <Input
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={
                  isReplying ? t('typingPlaceholder') : t('askPlaceholder')
                }
                disabled={isReplying}
                className={cn(
                  planFieldControlClass,
                  'h-9 pr-11 disabled:opacity-70'
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleSendMessage();
                  }
                }}
              />
              <Button
                size='icon-sm'
                onClick={() => void handleSendMessage()}
                disabled={!chatInput.trim() || isReplying}
                aria-label={t('sendMessage')}
                className={cn(
                  brandCtaClass,
                  'absolute top-1/2 right-4 size-8 -translate-y-1/2 rounded-none p-0'
                )}
              >
                <Icons.send className='size-3.5' />
              </Button>
            </div>
          </SurvaiPanel>
        </div>
    </div>
  );
}
