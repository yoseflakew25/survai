// ============================================================
// Collect Service — live FastAPI publish / stats
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type { CollectStats, PublishResult } from './types';

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(
      new Error(apiErrorMessage(data, fallback)),
      fallback
    )
  );
}

type ApiStats = {
  survey_id: string;
  response_count: number;
  current_version_id: string | null;
  status: string;
  collection_path: string | null;
};

type ApiPublish = {
  survey_id: string;
  version_id: string;
  version_number: number;
  status: string;
  published_at: string;
  collection_path: string;
};

function mapStats(s: ApiStats): CollectStats {
  return {
    surveyId: s.survey_id,
    responseCount: s.response_count,
    currentVersionId: s.current_version_id,
    status: s.status,
    collectionPath: s.collection_path
  };
}

export async function getCollectStats(surveyId: string): Promise<CollectStats> {
  const res = await apiFetch(`/surveys/${surveyId}/collect-stats`);
  if (!res.ok) await readError(res, 'Could not load collect stats');
  return mapStats((await res.json()) as ApiStats);
}

export async function publishSurvey(surveyId: string): Promise<PublishResult> {
  const res = await apiFetch(`/surveys/${surveyId}/publish`, {
    method: 'POST'
  });
  if (!res.ok) await readError(res, 'Could not publish survey');
  const data = (await res.json()) as ApiPublish;
  return {
    surveyId: data.survey_id,
    versionId: data.version_id,
    versionNumber: data.version_number,
    status: data.status,
    publishedAt: data.published_at,
    collectionPath: data.collection_path
  };
}

export async function closeSurvey(surveyId: string): Promise<CollectStats> {
  const res = await apiFetch(`/surveys/${surveyId}/close`, { method: 'POST' });
  if (!res.ok) await readError(res, 'Could not close survey');
  return mapStats((await res.json()) as ApiStats);
}
