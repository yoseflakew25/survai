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
  PlanInterviewBrief,
  PlanInterviewMessage,
  PlanInterviewTurnResult,
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
  is_locked?: boolean;
  linked_survey_id?: string | null;
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
const STREAM_TIMEOUT_MS = 180_000;

type ApiInterviewBrief = {
  title_hint?: string;
  audiences?: string[];
  decisions?: string[];
  constraints?: string[];
  summary?: string;
};

type ApiInterviewTurn = {
  assistant_reply: string;
  ready_to_generate: boolean;
  research_goal_draft: string;
  brief: ApiInterviewBrief;
};

function mapInterviewBrief(b: ApiInterviewBrief | undefined): PlanInterviewBrief {
  return {
    titleHint: b?.title_hint ?? '',
    audiences: b?.audiences ?? [],
    decisions: b?.decisions ?? [],
    constraints: b?.constraints ?? [],
    summary: b?.summary ?? ''
  };
}

function mapInterviewTurn(t: ApiInterviewTurn): PlanInterviewTurnResult {
  return {
    assistantReply: t.assistant_reply,
    readyToGenerate: Boolean(t.ready_to_generate),
    researchGoalDraft: t.research_goal_draft ?? '',
    brief: mapInterviewBrief(t.brief)
  };
}

export type PlanInterviewStreamHandlers = {
  onStatus?: (stage: string) => void;
  onDelta?: (text: string) => void;
};

/** SSE interview turn — status + progressive deltas; resolves with final turn. */
export async function sendPlanInterviewTurnStream(
  messages: PlanInterviewMessage[],
  content: string,
  handlers: PlanInterviewStreamHandlers = {}
): Promise<PlanInterviewTurnResult> {
  const res = await apiFetch(
    '/plans/interview/turn/stream',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream'
      },
      body: JSON.stringify({
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content
        })),
        content
      })
    },
    STREAM_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'Could not continue the plan interview');
  if (!res.body) {
    throw new Error('Plan interview stream returned an empty body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: PlanInterviewTurnResult | null = null;
  let streamError: string | null = null;

  const consumeBlock = (block: string) => {
    const lines = block.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    let payload: unknown;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'status' && payload && typeof payload === 'object') {
      const stage = (payload as { stage?: string }).stage;
      if (stage) handlers.onStatus?.(stage);
    } else if (event === 'delta' && payload && typeof payload === 'object') {
      const text = (payload as { text?: string }).text;
      if (text) handlers.onDelta?.(text);
    } else if (event === 'done' && payload && typeof payload === 'object') {
      result = mapInterviewTurn(payload as ApiInterviewTurn);
    } else if (event === 'error' && payload && typeof payload === 'object') {
      streamError =
        (payload as { detail?: string }).detail ||
        'Plan interview stream failed';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const block of parts) {
      if (block.trim()) consumeBlock(block);
    }
  }
  if (buffer.trim()) consumeBlock(buffer);

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error('Plan interview stream ended without a reply');
  return result;
}

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
    isLocked: Boolean(p.is_locked),
    linkedSurveyId: p.linked_survey_id ?? null,
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
