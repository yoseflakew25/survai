// ============================================================
// Analytics Service — live FastAPI (deterministic engine)
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  AnalyticsSummary,
  CrossTabResult,
  MetricValue,
  QuestionDistribution,
  SavedAnalysis
} from './types';

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(
      new Error(apiErrorMessage(data, fallback)),
      fallback
    )
  );
}

type ApiMetric = {
  key: string;
  label: string;
  value: number | string;
  unit: MetricValue['unit'];
};

type ApiSummary = {
  survey_id: string;
  survey_version_id: string;
  response_count: number;
  completion_rate: number;
  avg_completion_minutes: number | null;
  metrics: ApiMetric[];
};

type ApiBucket = { label: string; value: number; percent: number };

type ApiDistribution = {
  question_id: string;
  question_text: string;
  question_type: string;
  total_responses: number;
  missing_count: number;
  buckets: ApiBucket[];
};

type ApiQueryResponse = {
  survey_id: string;
  survey_version_id: string;
  distributions: ApiDistribution[];
};

type ApiCrossTab = {
  question_a_id: string;
  question_a_text: string;
  question_b_id: string;
  question_b_text: string;
  row_labels: string[];
  col_labels: string[];
  cells: {
    row_label: string;
    col_label: string;
    count: number;
    percent: number;
  }[];
  total_responses: number;
};

function mapSummary(s: ApiSummary): AnalyticsSummary {
  return {
    surveyId: s.survey_id,
    surveyVersionId: s.survey_version_id,
    responseCount: s.response_count,
    completionRate: s.completion_rate,
    avgCompletionMinutes: s.avg_completion_minutes ?? 0,
    metrics: s.metrics.map((m) => ({
      key: m.key,
      label: m.label,
      value: m.value,
      unit: m.unit
    }))
  };
}

function mapDistribution(d: ApiDistribution): QuestionDistribution {
  return {
    questionId: d.question_id,
    questionText: d.question_text,
    questionType: d.question_type,
    totalResponses: d.total_responses,
    missingCount: d.missing_count,
    buckets: d.buckets.map((b) => ({
      label: b.label,
      value: b.value,
      percent: b.percent
    }))
  };
}

function mapCrossTab(c: ApiCrossTab): CrossTabResult {
  return {
    questionAId: c.question_a_id,
    questionAText: c.question_a_text,
    questionBId: c.question_b_id,
    questionBText: c.question_b_text,
    rowLabels: c.row_labels,
    colLabels: c.col_labels,
    cells: c.cells.map((cell) => ({
      rowLabel: cell.row_label,
      colLabel: cell.col_label,
      count: cell.count,
      percent: cell.percent
    })),
    totalResponses: c.total_responses
  };
}

export async function getAnalyticsSummary(
  surveyId: string
): Promise<AnalyticsSummary> {
  const res = await apiFetch(`/surveys/${surveyId}/analytics/summary`);
  if (!res.ok) await readError(res, 'Could not load analytics summary');
  return mapSummary((await res.json()) as ApiSummary);
}

export async function getQuestionDistributions(
  surveyId: string
): Promise<QuestionDistribution[]> {
  const res = await apiFetch(`/surveys/${surveyId}/analytics/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (!res.ok) await readError(res, 'Could not load question distributions');
  const data = (await res.json()) as ApiQueryResponse;
  return data.distributions.map(mapDistribution);
}

export async function getCrossTab(
  surveyId: string,
  questionAId: string,
  questionBId: string
): Promise<CrossTabResult> {
  const res = await apiFetch(`/surveys/${surveyId}/analytics/crosstab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question_a_id: questionAId,
      question_b_id: questionBId
    })
  });
  if (!res.ok) await readError(res, 'Could not load cross-tabulation');
  return mapCrossTab((await res.json()) as ApiCrossTab);
}

/** Saved analyses persistence is not implemented yet — empty list. */
export async function getSavedAnalyses(
  surveyId: string
): Promise<SavedAnalysis[]> {
  void surveyId;
  return [];
}
