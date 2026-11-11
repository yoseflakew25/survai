'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  useQuery,
  useQueryClient,
  useSuspenseQuery
} from '@tanstack/react-query';
import {
  analyticsKeys,
  analyticsSummaryOptions,
  distributionsOptions,
  crossTabOptions,
  savedAnalysesOptions
} from '../api/queries';
import {
  createSavedAnalysis,
  deleteSavedAnalysis,
  exportAnalyticsCsv
} from '../api/service';
import type { Filter, SavedAnalysis } from '../api/types';
import { AnalyticsSummaryStats } from './analytics-summary-stats';
import { DistributionChart } from './distribution-chart';
import { CrossTabTable } from './cross-tab-table';
import { SavedAnalyses } from './saved-analyses';
import { SurveyComparePanel } from './survey-compare-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  SurvaiBrandCard,
  SurvaiPanel,
  SurvaiPanelBody,
  SurvaiPanelHeader
} from '@/components/survai-panel';
import { Icons } from '@/components/icons';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/lib/toast';
import Link from 'next/link';
import { canEditOrg, useAuth } from '@/lib/auth-context';
import { AuthQueryBoundary } from '@/components/layout/auth-query-boundary';
import { SurveyActivityFallback } from '@/features/surveys/components/survey-activity-fallback';

const CROSSTAB_TYPES = new Set([
  'single_choice',
  'dropdown',
  'rating_scale'
]);

interface AnalyticsDashboardProps {
  surveyId: string;
}

export function AnalyticsDashboard({ surveyId }: AnalyticsDashboardProps) {
  return (
    <AuthQueryBoundary
      fallback={<SurveyActivityFallback activity='fetch-analytics' />}
    >
      <AnalyticsContent surveyId={surveyId} />
    </AuthQueryBoundary>
  );
}

/** Shared section chrome used across the page's main column. */
function AnalyticsSection({
  title,
  subtitle,
  badge,
  children,
  tone = 'soft'
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
  children: ReactNode;
  tone?: 'brand' | 'primary' | 'soft';
}) {
  return (
    <SurvaiPanel>
      <SurvaiPanelHeader
        tone={tone}
        title={title}
        subtitle={subtitle}
        badge={badge}
      />
      <SurvaiPanelBody>{children}</SurvaiPanelBody>
    </SurvaiPanel>
  );
}

function AnalyticsContent({ surveyId }: { surveyId: string }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const canEdit = canEditOrg(user?.role);
  const [exporting, setExporting] = useState(false);
  const [savingView, setSavingView] = useState(false);
  const [deletingViewId, setDeletingViewId] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<Filter[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [crosstabAId, setCrosstabAId] = useState<string | null>(null);
  const [crosstabBId, setCrosstabBId] = useState<string | null>(null);

  const { data: summary } = useSuspenseQuery(analyticsSummaryOptions(surveyId));
  const { data: distributions } = useSuspenseQuery(
    distributionsOptions(surveyId, activeFilters)
  );
  const { data: savedAnalyses = [] } = useQuery(savedAnalysesOptions(surveyId));

  const crosstabAxes = distributions.filter((d) =>
    CROSSTAB_TYPES.has(d.questionType)
  );
  const questionAId =
    (crosstabAId &&
    crosstabAxes.some((d) => d.questionId === crosstabAId)
      ? crosstabAId
      : crosstabAxes[0]?.questionId) ?? '';
  const questionBId =
    (crosstabBId &&
    crosstabAxes.some((d) => d.questionId === crosstabBId) &&
    crosstabBId !== questionAId
      ? crosstabBId
      : crosstabAxes.find((d) => d.questionId !== questionAId)?.questionId) ??
    '';
  const { data: crossTab, isLoading: crossTabLoading } = useQuery(
    crossTabOptions(surveyId, questionAId, questionBId, activeFilters)
  );

  function applyFilter(questionId: string, value: string) {
    setActiveAnalysisId(null);
    setActiveFilters([{ questionId, op: 'eq', value }]);
    toast.success('Filter applied', {
      description: `Showing responses where answer is “${value}”.`
    });
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      await exportAnalyticsCsv(surveyId);
      toast.success('CSV downloaded');
    } catch (err) {
      toast.error('Export failed', {
        description:
          err instanceof Error ? err.message : 'Could not export CSV.'
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleSaveView(name: string) {
    setSavingView(true);
    try {
      const chartConfig =
        questionAId && questionBId
          ? {
              type: 'crosstab' as const,
              questionAId,
              questionBId
            }
          : null;
      const saved = await createSavedAnalysis(
        surveyId,
        name,
        activeFilters,
        chartConfig
      );
      await queryClient.invalidateQueries({
        queryKey: analyticsKeys.saved(surveyId)
      });
      setActiveAnalysisId(saved.id);
      toast.success('View saved', {
        description: 'Reports can reuse these filters when generating.'
      });
    } catch (err) {
      toast.error('Could not save view', {
        description: err instanceof Error ? err.message : 'Try again.'
      });
    } finally {
      setSavingView(false);
    }
  }

  function handleApplySaved(analysis: SavedAnalysis) {
    setActiveFilters(analysis.filters);
    setActiveAnalysisId(analysis.id);
    const cfg = analysis.chartConfig;
    if (
      cfg &&
      typeof cfg === 'object' &&
      cfg.type === 'crosstab' &&
      typeof cfg.questionAId === 'string' &&
      typeof cfg.questionBId === 'string'
    ) {
      setCrosstabAId(cfg.questionAId);
      setCrosstabBId(cfg.questionBId);
    }
    toast.success(`Applied “${analysis.name}”`);
  }

  async function handleDeleteView(analysis: SavedAnalysis) {
    setDeletingViewId(analysis.id);
    try {
      await deleteSavedAnalysis(surveyId, analysis.id);
      await queryClient.invalidateQueries({
        queryKey: analyticsKeys.saved(surveyId)
      });
      if (activeAnalysisId === analysis.id) {
        setActiveAnalysisId(null);
      }
      toast.success('View deleted', {
        description: `Removed “${analysis.name}”.`
      });
    } catch (err) {
      toast.error('Could not delete view', {
        description: err instanceof Error ? err.message : 'Try again.'
      });
    } finally {
      setDeletingViewId(null);
    }
  }

  const reportHref =
    activeAnalysisId != null
      ? `/dashboard/surveys/${surveyId}/reports?savedAnalysisId=${activeAnalysisId}`
      : `/dashboard/surveys/${surveyId}/reports`;

  return (
    <div className='space-y-4'>
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main content */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary Stats */}
          <AnalyticsSection
            tone='brand'
            title='Response Summary'
            subtitle='Overview of collected survey responses'
            badge={
              summary.surveyVersionId ? (
                <Badge className='rounded-full border border-[color-mix(in_srgb,var(--primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] font-mono text-[10px] text-brand-foreground'>
                  ver {summary.surveyVersionId.slice(0, 8)}
                </Badge>
              ) : undefined
            }
          >
            <AnalyticsSummaryStats summary={summary} />
          </AnalyticsSection>

          {/* Distribution Charts */}
          <AnalyticsSection
            title='Question Distributions'
            subtitle={
              activeFilters.length > 0
                ? 'Filtered response breakdown'
                : 'Per-question response breakdown'
            }
            badge={
              <Badge variant='secondary' className='text-xs'>
                {distributions.length} charts
              </Badge>
            }
          >
            {distributions.length === 0 ? (
              <p className='text-sm text-muted-foreground'>
                No categorical questions to chart yet — publish the survey and
                collect responses first.
              </p>
            ) : (
              <div className='grid gap-4 md:grid-cols-2'>
                {distributions.map((dist) => (
                  <DistributionChart
                    key={dist.questionId}
                    distribution={dist}
                    surveyId={surveyId}
                    onFilterBucket={(label) =>
                      applyFilter(dist.questionId, label)
                    }
                  />
                ))}
              </div>
            )}
          </AnalyticsSection>

          {/* Cross-Tab */}
          <AnalyticsSection
            title='Cross-Tabulation'
            subtitle={
              crossTab
                ? `${crossTab.questionAText} × ${crossTab.questionBText}`
                : 'Compare two categorical questions'
            }
            badge={
              <div className='flex flex-wrap items-center gap-1.5'>
                {crosstabAxes.length >= 2 ? (
                  <>
                    <select
                      className='border-input bg-background h-7 max-w-[9rem] rounded-md border px-1.5 text-[10px]'
                      value={questionAId}
                      onChange={(e) => {
                        setActiveAnalysisId(null);
                        setCrosstabAId(e.target.value);
                      }}
                      aria-label='Cross-tab row question'
                    >
                      {crosstabAxes.map((d) => (
                        <option key={d.questionId} value={d.questionId}>
                          {d.questionText.slice(0, 40)}
                        </option>
                      ))}
                    </select>
                    <span className='text-muted-foreground text-[10px]'>×</span>
                    <select
                      className='border-input bg-background h-7 max-w-[9rem] rounded-md border px-1.5 text-[10px]'
                      value={questionBId}
                      onChange={(e) => {
                        setActiveAnalysisId(null);
                        setCrosstabBId(e.target.value);
                      }}
                      aria-label='Cross-tab column question'
                    >
                      {crosstabAxes
                        .filter((d) => d.questionId !== questionAId)
                        .map((d) => (
                          <option key={d.questionId} value={d.questionId}>
                            {d.questionText.slice(0, 40)}
                          </option>
                        ))}
                    </select>
                  </>
                ) : null}
                {crossTab ? (
                  <Badge variant='secondary' className='text-xs'>
                    {crossTab.totalResponses} responses
                  </Badge>
                ) : null}
              </div>
            }
          >
            {!questionAId || !questionBId ? (
              <p className='text-sm text-muted-foreground'>
                Need at least two single-choice, dropdown, or rating questions
                to build a cross-tab.
              </p>
            ) : crossTabLoading ? (
              <Skeleton className='h-56 w-full rounded-lg' />
            ) : crossTab ? (
              <CrossTabTable result={crossTab} />
            ) : (
              <p className='text-sm text-muted-foreground'>
                Cross-tab could not be loaded for this survey.
              </p>
            )}
          </AnalyticsSection>
        </div>

        {/* Sidebar */}
        <div className='sticky top-[4.5rem] self-start space-y-6'>
          {canEdit ? (
            <SurvaiBrandCard
              title='Generate Report?'
              description={
                activeAnalysisId
                  ? 'Report will use the active saved view filters'
                  : 'AI will create a comprehensive report with findings and recommendations'
              }
            >
              <Link href={reportHref} className='block w-full'>
                <Button
                  className='h-11 w-full rounded-xl border border-foreground/15 bg-foreground font-semibold text-background hover:bg-foreground/90'
                  size='lg'
                >
                  Generate Report
                  <Icons.arrowRight className='ml-2 h-4 w-4' />
                </Button>
              </Link>
            </SurvaiBrandCard>
          ) : null}
          <SavedAnalyses
            analyses={savedAnalyses}
            activeFilters={activeFilters}
            activeAnalysisId={activeAnalysisId}
            canEdit={canEdit}
            saving={savingView}
            deletingId={deletingViewId}
            onApply={handleApplySaved}
            onClear={() => {
              setActiveFilters([]);
              setActiveAnalysisId(null);
            }}
            onSave={handleSaveView}
            onDelete={handleDeleteView}
          />
          <SurvaiPanel>
            <SurvaiPanelBody className='space-y-2'>
              <Button
                variant='outline'
                className='h-10 w-full rounded-xl'
                disabled={exporting}
                onClick={() => void handleExportCsv()}
              >
                {exporting ? (
                  <Icons.spinner className='mr-2 size-4 animate-spin' />
                ) : (
                  <Icons.fileTypeXls className='mr-2 size-4' />
                )}
                Export CSV
              </Button>
            </SurvaiPanelBody>
          </SurvaiPanel>
          <SurveyComparePanel surveyId={surveyId} />
        </div>
      </div>
    </div>
  );
}

export function AnalyticsDashboardSkeleton() {
  return (
    <div className='space-y-4'>
      <div className='grid gap-6 lg:grid-cols-3'>
        {/* Main column */}
        <div className='space-y-6 lg:col-span-2'>
          {/* Summary stats section */}
          <div className='rounded-lg border'>
            <div className='border-b border-border bg-brand-soft px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-36 rounded' />
                  <Skeleton className='h-3 w-52 rounded' />
                </div>
              </div>
            </div>
            <div className='grid grid-cols-2 gap-3 p-4 xl:grid-cols-4'>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className='h-28 w-full rounded-lg' />
              ))}
            </div>
          </div>

          {/* Charts section */}
          <div className='rounded-lg border'>
            <div className='border-b border-border bg-brand-soft px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-40 rounded' />
                  <Skeleton className='h-3 w-48 rounded' />
                </div>
              </div>
            </div>
            <div className='grid gap-4 p-4 md:grid-cols-2'>
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className='h-64 w-full rounded-lg' />
              ))}
            </div>
          </div>

          {/* Cross-tab section */}
          <div className='rounded-lg border'>
            <div className='border-b border-border bg-brand-soft px-4 py-3'>
              <div className='flex items-center gap-3'>
                <Skeleton className='size-6 rounded' />
                <div className='space-y-1.5'>
                  <Skeleton className='h-4 w-40 rounded' />
                  <Skeleton className='h-3 w-56 rounded' />
                </div>
              </div>
            </div>
            <div className='p-4'>
              <Skeleton className='h-56 w-full rounded-lg' />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className='space-y-6'>
          <Skeleton className='h-56 w-full rounded-xl' />
          <Skeleton className='h-64 w-full rounded-lg' />
        </div>
      </div>
    </div>
  );
}
