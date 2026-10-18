// ============================================================
// Surveys list — live FastAPI (surveys that have a linked plan)
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

type ApiQuestion = { id: string };
type ApiSection = { questions?: ApiQuestion[] };

type ApiSurvey = {
  id: string;
  plan_id: string | null;
  title: string;
  description: string | null;
  status: SurveyStatus;
  sections?: ApiSection[];
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
  const sections = s.sections ?? [];
  const questionsCount = sections.reduce(
    (sum, sec) => sum + (sec.questions?.length ?? 0),
    0
  );

  return {
    id: s.id,
    title: s.title,
    description: s.description,
    status: s.status,
    sectionsCount: sections.length,
    questionsCount,
    // Collection / analytics not wired yet (Phase 5+)
    responsesCount: 0,
    completionRate: null,
    lastResponseAt: null,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

function applyFilters(
  items: SurveyListItem[],
  filters: SurveyListFilters
): SurveyListItem[] {
  let result = items;

  if (filters.search?.trim()) {
    const q = filters.search.trim().toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.description?.toLowerCase().includes(q) ?? false)
    );
  }

  if (filters.status) {
    result = result.filter((s) => s.status === filters.status);
  }

  if (filters.sort) {
    const [field, dir] = filters.sort.split(':');
    const desc = dir === 'desc';
    result = [...result].sort((a, b) => {
      const aVal = a[field as keyof SurveyListItem];
      const bVal = b[field as keyof SurveyListItem];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return desc ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return desc ? bVal - aVal : aVal - bVal;
      }
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return desc ? -1 : 1;
      if (bVal == null) return desc ? 1 : -1;
      return 0;
    });
  }

  return result;
}

/**
 * List org surveys that have a linked research plan (`plan_id` set).
 * Search / status / sort applied client-side for the table filters.
 */
export async function getSurveysList(
  filters: SurveyListFilters
): Promise<SurveyListResponse> {
  const res = await apiFetch('/surveys');
  if (!res.ok) await readError(res, 'Could not load surveys');

  const data = (await res.json()) as { surveys: ApiSurvey[]; total: number };
  // Backend already filters to plan-linked surveys; keep a client guard too.
  const mapped = (data.surveys ?? [])
    .filter((s) => s.plan_id != null)
    .map(mapListItem);

  const filtered = applyFilters(mapped, filters);
  return { surveys: filtered, total: filtered.length };
}
