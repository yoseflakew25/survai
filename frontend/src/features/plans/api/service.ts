// ============================================================
// Plans Service — live FastAPI (Gemini planner)
// ============================================================
// Components never import from here directly — go through queries.ts.
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  Plan,
  PlanListResponse,
  PlanCreatePayload,
  PlanUpdatePayload,
  ProposedSection,
  SurveyPlanOutput
} from './types';

type ApiProposedSection = { title: string; rationale: string };

type ApiPlan = {
  id: string;
  created_by: string;
  organization_id: string | null;
  research_goal: string;
  objectives: string[];
  research_questions: string[];
  target_respondents: string[];
  proposed_sections: ApiProposedSection[];
  estimated_length_minutes: number | null;
  status: 'draft' | 'approved';
  ai_generation_meta: {
    model: string;
    prompt_version: string;
    request_id: string;
    latency_ms: number;
  } | null;
  created_at: string;
  updated_at: string;
};

type ApiGenerateResponse = {
  plan: ApiPlan;
  objectives: string[];
  research_questions: string[];
  target_respondents: string[];
  proposed_sections: ApiProposedSection[];
  estimated_length_minutes: number;
  notes: string | null;
};

const AI_TIMEOUT_MS = 90_000;

function mapSection(s: ApiProposedSection): ProposedSection {
  return { title: s.title, rationale: s.rationale };
}

function mapPlan(p: ApiPlan): Plan {
  return {
    id: p.id,
    createdBy: p.created_by,
    organizationId: p.organization_id,
    researchGoal: p.research_goal,
    objectives: p.objectives ?? [],
    researchQuestions: p.research_questions ?? [],
    targetRespondents: p.target_respondents ?? [],
    proposedSections: (p.proposed_sections ?? []).map(mapSection),
    estimatedLengthMinutes: p.estimated_length_minutes,
    status: p.status,
    aiGenerationMeta: p.ai_generation_meta
      ? {
          model: p.ai_generation_meta.model,
          promptVersion: p.ai_generation_meta.prompt_version,
          requestId: p.ai_generation_meta.request_id,
          latencyMs: p.ai_generation_meta.latency_ms
        }
      : null,
    createdAt: p.created_at,
    updatedAt: p.updated_at
  };
}

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(
      new Error(apiErrorMessage(data, fallback)),
      fallback
    )
  );
}

export async function getPlans(): Promise<PlanListResponse> {
  const res = await apiFetch('/plans');
  if (!res.ok) await readError(res, 'Could not load plans');
  const data = (await res.json()) as { plans: ApiPlan[]; total: number };
  return {
    plans: (data.plans ?? []).map(mapPlan),
    total: data.total ?? 0
  };
}

export async function getPlanById(id: string): Promise<Plan | null> {
  const res = await apiFetch(`/plans/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not load plan');
  return mapPlan((await res.json()) as ApiPlan);
}

export async function createPlan(data: PlanCreatePayload): Promise<Plan> {
  const res = await apiFetch('/plans', {
    method: 'POST',
    body: JSON.stringify({ research_goal: data.researchGoal })
  });
  if (!res.ok) await readError(res, 'Could not create plan');
  return mapPlan((await res.json()) as ApiPlan);
}

/**
 * Create a plan and run Gemini planner in one request.
 * Progress callbacks are UX-only (API is a single round trip).
 */
export async function createPlanWithAI(
  data: PlanCreatePayload,
  onProgress?: (step: string, progress: number) => void
): Promise<Plan> {
  onProgress?.('Creating plan…', 15);
  onProgress?.('Analyzing research goal with AI…', 40);

  const res = await apiFetch(
    '/plans/generate',
    {
      method: 'POST',
      body: JSON.stringify({ research_goal: data.researchGoal })
    },
    AI_TIMEOUT_MS
  );

  onProgress?.('Finalizing plan…', 90);
  if (!res.ok) await readError(res, 'AI could not generate the plan');
  const payload = (await res.json()) as ApiGenerateResponse;
  onProgress?.('Plan generated!', 100);
  return mapPlan(payload.plan);
}

export async function updatePlan(
  id: string,
  data: PlanUpdatePayload
): Promise<Plan | null> {
  const body: Record<string, unknown> = {};
  if (data.researchGoal !== undefined) body.research_goal = data.researchGoal;
  if (data.objectives !== undefined) body.objectives = data.objectives;
  if (data.researchQuestions !== undefined) {
    body.research_questions = data.researchQuestions;
  }
  if (data.targetRespondents !== undefined) {
    body.target_respondents = data.targetRespondents;
  }
  if (data.proposedSections !== undefined) {
    body.proposed_sections = data.proposedSections;
  }
  if (data.estimatedLengthMinutes !== undefined) {
    body.estimated_length_minutes = data.estimatedLengthMinutes;
  }
  if (data.status !== undefined) body.status = data.status;

  const res = await apiFetch(`/plans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not update plan');
  return mapPlan((await res.json()) as ApiPlan);
}

/**
 * Re-run Gemini on an existing plan.
 * Hard-replaces AI fields server-side (never merges with prior content).
 * Pass researchGoal so the latest editor text is used in the same request.
 */
export async function generatePlanWithAI(
  planId: string,
  researchGoal?: string
): Promise<{
  plan: Plan;
  output: SurveyPlanOutput;
}> {
  const body =
    researchGoal !== undefined
      ? JSON.stringify({ research_goal: researchGoal })
      : undefined;
  const res = await apiFetch(
    `/plans/${planId}/generate`,
    {
      method: 'POST',
      ...(body ? { body } : {})
    },
    AI_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'AI could not generate the plan');
  const payload = (await res.json()) as ApiGenerateResponse;
  return {
    plan: mapPlan(payload.plan),
    output: {
      objectives: payload.objectives,
      researchQuestions: payload.research_questions,
      targetRespondents: payload.target_respondents,
      proposedSections: payload.proposed_sections.map(mapSection),
      estimatedLengthMinutes: payload.estimated_length_minutes,
      notes: payload.notes
    }
  };
}

export async function approvePlan(id: string): Promise<Plan | null> {
  const res = await apiFetch(`/plans/${id}/approve`, { method: 'POST' });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not approve plan');
  return mapPlan((await res.json()) as ApiPlan);
}
