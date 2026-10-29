// ============================================================
// Reports Service — live FastAPI (grounded generation)
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  ExportResult,
  ReportAudience,
  ReportChatMessage,
  ReportSection,
  SurveyReport
} from './types';

/** Detailed multi-section Gemini reports often take 60–150s; default apiFetch is 20s. */
const AI_TIMEOUT_MS = 180_000;

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(
      new Error(apiErrorMessage(data, fallback)),
      fallback
    )
  );
}

type ApiSection = {
  id: string;
  title: string;
  content: string;
  metric_refs?: string[];
};

type ApiIntegrity = {
  matches_current_version: boolean;
  is_stale: boolean;
  snapshot_response_count: number;
  live_response_count: number | null;
  snapshot_survey_version_id: string;
  current_survey_version_id: string | null;
};

type ApiReport = {
  id: string;
  survey_id: string;
  survey_version_id: string;
  survey_title: string;
  title: string;
  audience: ReportAudience;
  status: 'draft' | 'final';
  model: string | null;
  stats: {
    response_count: number;
    completion_rate: number;
    avg_completion_minutes: number | null;
    questions_count: number;
  };
  sections: ApiSection[];
  integrity: ApiIntegrity;
  created_at: string;
  updated_at: string;
};

type ApiChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metric_refs?: string[];
  confidence: ReportChatMessage['confidence'];
  created_at: string;
};

type ApiExport = {
  id: string;
  type: ExportResult['type'];
  status: string;
  content_text: string | null;
  content_base64?: string | null;
  filename?: string | null;
  mime_type?: string | null;
  file_url: string | null;
  created_at: string;
};

function mapSection(s: ApiSection): ReportSection {
  return {
    id: s.id,
    title: s.title,
    content: s.content,
    metricRefs: s.metric_refs ?? []
  };
}

function mapReport(r: ApiReport): SurveyReport {
  const integrity = r.integrity ?? {
    matches_current_version: true,
    is_stale: false,
    snapshot_response_count: r.stats?.response_count ?? 0,
    live_response_count: null,
    snapshot_survey_version_id: r.survey_version_id,
    current_survey_version_id: r.survey_version_id
  };
  return {
    id: r.id,
    surveyId: r.survey_id,
    surveyVersionId: r.survey_version_id,
    surveyTitle: r.survey_title,
    title: r.title,
    audience: r.audience,
    status: r.status,
    model: r.model,
    stats: {
      responseCount: r.stats.response_count,
      completionRate: r.stats.completion_rate,
      avgCompletionMinutes: r.stats.avg_completion_minutes,
      questionsCount: r.stats.questions_count
    },
    sections: (r.sections ?? []).map(mapSection),
    integrity: {
      matchesCurrentVersion: integrity.matches_current_version,
      isStale: integrity.is_stale,
      snapshotResponseCount: integrity.snapshot_response_count,
      liveResponseCount: integrity.live_response_count,
      snapshotSurveyVersionId: integrity.snapshot_survey_version_id,
      currentSurveyVersionId: integrity.current_survey_version_id
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

function mapChat(m: ApiChatMessage): ReportChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    metricRefs: m.metric_refs ?? [],
    confidence: m.confidence,
    createdAt: m.created_at
  };
}

function mapExport(e: ApiExport): ExportResult {
  return {
    id: e.id,
    type: e.type,
    status: e.status,
    contentText: e.content_text,
    contentBase64: e.content_base64 ?? null,
    filename: e.filename ?? null,
    mimeType: e.mime_type ?? null,
    fileUrl: e.file_url,
    createdAt: e.created_at
  };
}

export async function getLatestReport(
  surveyId: string
): Promise<SurveyReport | null> {
  const res = await apiFetch(`/surveys/${surveyId}/reports/latest`);
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not load report');
  const data = await res.json();
  if (data == null) return null;
  return mapReport(data as ApiReport);
}

async function pollJobResult(jobId: string): Promise<ApiReport> {
  const deadline = Date.now() + AI_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await apiFetch(`/jobs/${jobId}`);
    if (!res.ok) await readError(res, 'Report job failed');
    const data = (await res.json()) as {
      status: string;
      result?: ApiReport;
      error?: string | null;
    };
    if (data.status === 'complete' && data.result) {
      return data.result;
    }
    if (data.status === 'failed' || data.status === 'not_found') {
      throw new Error(data.error || 'Report generation failed');
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error('Report generation timed out. Please try again.');
}

export async function generateReport(
  surveyId: string,
  audience: ReportAudience = 'internal'
): Promise<SurveyReport> {
  const res = await apiFetch(
    `/surveys/${surveyId}/reports`,
    {
      method: 'POST',
      body: JSON.stringify({ audience })
    },
    AI_TIMEOUT_MS
  );
  if (res.status === 202) {
    const accepted = (await res.json()) as { job_id: string };
    const report = await pollJobResult(accepted.job_id);
    return mapReport(report);
  }
  if (!res.ok) await readError(res, 'Could not generate report');
  return mapReport((await res.json()) as ApiReport);
}

export async function updateReport(
  reportId: string,
  patch: {
    title?: string;
    status?: 'draft' | 'final';
    sections?: ReportSection[];
  }
): Promise<SurveyReport> {
  const body: Record<string, unknown> = {};
  if (patch.title !== undefined) body.title = patch.title;
  if (patch.status !== undefined) body.status = patch.status;
  if (patch.sections !== undefined) {
    body.sections = patch.sections.map((s) => ({
      id: s.id,
      title: s.title,
      content: s.content,
      metric_refs: s.metricRefs ?? []
    }));
  }
  const res = await apiFetch(`/reports/${reportId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  if (!res.ok) await readError(res, 'Could not save report');
  return mapReport((await res.json()) as ApiReport);
}

/** @deprecated prefer updateReport */
export async function updateReportSections(
  reportId: string,
  sections: ReportSection[]
): Promise<SurveyReport> {
  return updateReport(reportId, { sections });
}

export async function regenerateReportSection(
  reportId: string,
  sectionId: string
): Promise<SurveyReport> {
  const res = await apiFetch(
    `/reports/${reportId}/sections/regenerate`,
    {
      method: 'POST',
      body: JSON.stringify({ section_id: sectionId })
    },
    AI_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'Could not regenerate section');
  return mapReport((await res.json()) as ApiReport);
}

export async function getReportChat(
  reportId: string
): Promise<ReportChatMessage[]> {
  const res = await apiFetch(`/reports/${reportId}/chat`);
  if (!res.ok) await readError(res, 'Could not load chat');
  const data = (await res.json()) as { messages: ApiChatMessage[] };
  return (data.messages ?? []).map(mapChat);
}

export async function sendReportChat(
  reportId: string,
  message: string
): Promise<ReportChatMessage[]> {
  // Chat answers are short — don't wait the full report-gen ceiling.
  const CHAT_TIMEOUT_MS = 45_000;
  const res = await apiFetch(
    `/reports/${reportId}/chat`,
    {
      method: 'POST',
      body: JSON.stringify({ message })
    },
    CHAT_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'Could not send message');
  const data = (await res.json()) as { messages: ApiChatMessage[] };
  return (data.messages ?? []).map(mapChat);
}

export async function exportReport(
  reportId: string,
  type: 'pdf' | 'markdown' = 'pdf'
): Promise<ExportResult> {
  const res = await apiFetch(`/reports/${reportId}/export`, {
    method: 'POST',
    body: JSON.stringify({ type })
  });
  if (!res.ok) await readError(res, 'Could not export report');
  return mapExport((await res.json()) as ApiExport);
}

function triggerDownload(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function base64ToBlob(b64: string, mime: string): Blob {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Download the grounded report as a real PDF file. */
export async function downloadReportPdf(
  reportId: string,
  title: string
): Promise<void> {
  const result = await exportReport(reportId, 'pdf');
  const safe = title.replace(/[^\w\-]+/g, '_').slice(0, 60) || 'report';
  if (!result.contentBase64) {
    throw new Error('PDF export returned no file data');
  }
  const blob = base64ToBlob(
    result.contentBase64,
    result.mimeType ?? 'application/pdf'
  );
  triggerDownload(result.filename ?? `${safe}.pdf`, blob);
}
