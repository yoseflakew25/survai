// ============================================================
// Reviewer Service — live FastAPI (Gemini reviewer)
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  FindingIssueType,
  FindingStatus,
  ReviewerFinding,
  ReviewerReport,
  ScoreCriterion
} from './types';

const AI_TIMEOUT_MS = 120_000;

type ApiScoreCriterion = {
  label: string;
  score: number;
  description: string;
};

type ApiFinding = {
  id: string;
  reviewer_report_id: string;
  question_id: string | null;
  question_text: string | null;
  section_title: string | null;
  issue_type: FindingIssueType;
  explanation: string;
  suggested_rewrite: string | null;
  status: FindingStatus;
  created_at: string;
};

type ApiReport = {
  id: string;
  survey_id: string;
  overall_quality_score: number | null;
  estimated_completion_minutes: number | null;
  required_question_count: number | null;
  score_criteria: ApiScoreCriterion[] | null;
  findings: ApiFinding[];
  ai_generation_meta: Record<string, unknown> | null;
  notes: string | null;
  created_at: string;
};

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(
      new Error(apiErrorMessage(data, fallback)),
      fallback
    )
  );
}

function mapCriterion(c: ApiScoreCriterion): ScoreCriterion {
  return {
    label: c.label,
    score: c.score,
    description: c.description
  };
}

function mapFinding(f: ApiFinding): ReviewerFinding {
  return {
    id: f.id,
    reviewerReportId: f.reviewer_report_id,
    questionId: f.question_id,
    questionText: f.question_text,
    sectionTitle: f.section_title,
    issueType: f.issue_type,
    explanation: f.explanation,
    suggestedRewrite: f.suggested_rewrite,
    status: f.status,
    createdAt: f.created_at
  };
}

function mapMeta(
  meta: Record<string, unknown> | null
): ReviewerReport['aiGenerationMeta'] {
  if (!meta) return null;
  return {
    model: typeof meta.model === 'string' ? meta.model : 'unknown',
    promptVersion:
      typeof meta.prompt_version === 'string'
        ? meta.prompt_version
        : typeof meta.promptVersion === 'string'
          ? meta.promptVersion
          : 'reviewer_v1',
    latencyMs:
      typeof meta.latency_ms === 'number'
        ? meta.latency_ms
        : typeof meta.latencyMs === 'number'
          ? meta.latencyMs
          : 0
  };
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function mapReport(r: ApiReport): ReviewerReport {
  return {
    id: r.id,
    surveyId: r.survey_id,
    overallQualityScore: asNumber(r.overall_quality_score),
    estimatedCompletionMinutes: asNumber(r.estimated_completion_minutes),
    requiredQuestionCount: asNumber(r.required_question_count),
    scoreCriteria: (r.score_criteria ?? []).map(mapCriterion),
    findings: (r.findings ?? []).map(mapFinding),
    aiGenerationMeta: mapMeta(r.ai_generation_meta),
    notes: r.notes,
    createdAt: r.created_at
  };
}

export async function getLatestReview(
  surveyId: string
): Promise<ReviewerReport | null> {
  const res = await apiFetch(`/surveys/${surveyId}/review/latest`);
  if (!res.ok) {
    await readError(res, 'Failed to load review');
  }
  const data: ApiReport | null = await res.json();
  if (!data) return null;
  return mapReport(data);
}

export async function triggerReview(
  surveyId: string
): Promise<ReviewerReport> {
  const res = await apiFetch(
    `/surveys/${surveyId}/review`,
    { method: 'POST' },
    AI_TIMEOUT_MS
  );
  if (!res.ok) {
    await readError(res, 'AI could not complete the review');
  }
  const data: ApiReport = await res.json();
  return mapReport(data);
}

export async function updateFindingStatus(
  findingId: string,
  status: FindingStatus
): Promise<ReviewerFinding | null> {
  const res = await apiFetch(`/reviewer-findings/${findingId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    await readError(res, 'Failed to update finding');
  }
  const data: ApiFinding = await res.json();
  return mapFinding(data);
}
