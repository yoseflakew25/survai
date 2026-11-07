// ============================================================
// Surveys list — live FastAPI (server-side page/search/status/sort)
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  SurveyListFilters,
  SurveyListItem,
  SurveyListResponse,
  SurveyStatus
} from './types';

type ApiSurvey = {
  id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  status: SurveyStatus;
  sections_count?: number | null;
  questions_count?: number | null;
  responses_count?: number | null;
  instrument_family_id?: string | null;
  wave_label?: string | null;
  created_at: string;
  updated_at: string;
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

function mapListItem(s: ApiSurvey): SurveyListItem {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    sectionsCount: s.sections_count ?? 0,
    questionsCount: s.questions_count ?? 0,
    responsesCount: s.responses_count ?? 0,
    completionRate: null,
    lastResponseAt: null,
    instrumentFamilyId: s.instrument_family_id ?? null,
    waveLabel: s.wave_label ?? null,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

/**
 * List org surveys that have a linked research plan (`plan_id` set).
 * Pagination / search / status / sort are applied on the server.
 */
export async function getSurveysList(
  filters: SurveyListFilters
): Promise<SurveyListResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 10));
  if (filters.search?.trim()) params.set('search', filters.search.trim());
  if (filters.status) params.set('status', filters.status);
  if (filters.sort) params.set('sort', filters.sort);

  const res = await apiFetch(`/surveys?${params.toString()}`);
  if (!res.ok) await readError(res, 'Could not load surveys');

  const data = (await res.json()) as { surveys: ApiSurvey[]; total: number };
  return {
    surveys: (data.surveys ?? []).map(mapListItem),
    total: data.total ?? 0
  };
}
