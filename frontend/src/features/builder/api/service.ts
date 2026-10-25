// ============================================================
// Builder Service — live FastAPI (Gemini builder)
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  ConditionalLogic,
  Question,
  QuestionOption,
  QuestionType,
  Section,
  Survey,
  SurveyListResponse,
  ValidationRules
} from './types';

const AI_TIMEOUT_MS = 120_000;

type ApiQuestionOption = { id: string; label: string; value: string };

type ApiQuestion = {
  id: string;
  section_id: string;
  survey_id: string;
  type: QuestionType;
  prompt_text: string;
  help_text: string | null;
  is_required: boolean;
  order_index: number;
  options: ApiQuestionOption[] | null;
  validation_rules: Record<string, number | string> | null;
  conditional_logic: Record<string, unknown> | null;
  source: 'ai_generated' | 'manual' | 'ai_edited';
  created_at: string;
  updated_at: string;
};

type ApiSection = {
  id: string;
  survey_id: string;
  title: string;
  description: string | null;
  order_index: number;
  questions: ApiQuestion[];
  created_at: string;
  updated_at: string;
};

type ApiSurvey = {
  id: string;
  plan_id: string | null;
  organization_id: string | null;
  created_by: string;
  title: string;
  description: string | null;
  status: Survey['status'];
  anonymous_collection: boolean;
  current_version_id: string | null;
  sections: ApiSection[];
  created_at: string;
  updated_at: string;
};

type ApiGenerateResponse = {
  survey: ApiSurvey;
  notes: string | null;
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

function mapOptions(
  options: ApiQuestionOption[] | null
): QuestionOption[] | null {
  if (!options) return null;
  return options.map((o) => ({ id: o.id, label: o.label, value: o.value }));
}

function mapValidation(
  rules: Record<string, number | string> | null
): ValidationRules | null {
  if (!rules) return null;
  return {
    min: typeof rules.min === 'number' ? rules.min : undefined,
    max: typeof rules.max === 'number' ? rules.max : undefined,
    minLength:
      typeof rules.min_length === 'number' ? rules.min_length : undefined,
    maxLength:
      typeof rules.max_length === 'number' ? rules.max_length : undefined,
    regex: typeof rules.regex === 'string' ? rules.regex : undefined
  };
}

function mapConditionalLogic(
  raw: Record<string, unknown> | null
): ConditionalLogic | null {
  if (!raw || typeof raw !== 'object') return null;
  const operator = raw.operator === 'OR' ? 'OR' : 'AND';
  const rulesRaw = Array.isArray(raw.rules) ? raw.rules : [];
  const rules = rulesRaw.flatMap((r) => {
    if (!r || typeof r !== 'object') return [];
    const row = r as Record<string, unknown>;
    const questionId = String(row.question_id ?? row.questionId ?? '');
    const op = String(row.op ?? 'eq') as ConditionalLogic['rules'][number]['op'];
    if (!questionId) return [];
    return [
      {
        questionId,
        op,
        value: row.value as string | number
      }
    ];
  });
  if (rules.length === 0) return null;
  return { operator, rules };
}

function mapQuestion(q: ApiQuestion): Question {
  return {
    id: q.id,
    sectionId: q.section_id,
    surveyId: q.survey_id,
    type: q.type,
    promptText: q.prompt_text,
    helpText: q.help_text,
    isRequired: q.is_required,
    orderIndex: q.order_index,
    options: mapOptions(q.options),
    validationRules: mapValidation(q.validation_rules),
    conditionalLogic: mapConditionalLogic(q.conditional_logic),
    pendingConditionalLogic: null,
    source: q.source,
    createdAt: q.created_at,
    updatedAt: q.updated_at
  };
}

function mapSection(s: ApiSection): Section {
  return {
    id: s.id,
    surveyId: s.survey_id,
    title: s.title,
    description: s.description,
    orderIndex: s.order_index,
    questions: (s.questions ?? [])
      .map(mapQuestion)
      .toSorted((a, b) => a.orderIndex - b.orderIndex),
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

function mapSurvey(s: ApiSurvey): Survey {
  return {
    id: s.id,
    planId: s.plan_id,
    organizationId: s.organization_id,
    createdBy: s.created_by,
    title: s.title,
    description: s.description,
    status: s.status,
    anonymousCollection: s.anonymous_collection,
    currentVersionId: s.current_version_id,
    sections: (s.sections ?? [])
      .map(mapSection)
      .toSorted((a, b) => a.orderIndex - b.orderIndex),
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

export async function getSurveys(): Promise<SurveyListResponse> {
  const res = await apiFetch('/surveys');
  if (!res.ok) await readError(res, 'Could not load surveys');
  const data = (await res.json()) as { surveys: ApiSurvey[]; total: number };
  return {
    surveys: (data.surveys ?? []).map(mapSurvey),
    total: data.total ?? 0
  };
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  const res = await apiFetch(`/surveys/${id}`);
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not load survey');
  return mapSurvey((await res.json()) as ApiSurvey);
}

/**
 * Create survey from plan and run Gemini builder (hard-replaces any empty tree).
 * Same survey id is returned — regenerate later keeps that id.
 */
export async function createSurveyFromPlan(
  planId: string,
  title: string
): Promise<Survey> {
  const res = await apiFetch(
    '/surveys/from-plan',
    {
      method: 'POST',
      body: JSON.stringify({
        plan_id: planId,
        title,
        generate: true
      })
    },
    AI_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'Could not create survey from plan');
  const payload = (await res.json()) as ApiGenerateResponse;
  return mapSurvey(payload.survey);
}

export async function updateSurveyTitle(
  id: string,
  title: string
): Promise<Survey | null> {
  const res = await apiFetch(`/surveys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ title })
  });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not update survey title');
  return mapSurvey((await res.json()) as ApiSurvey);
}

/** Permanently delete a survey and its sections/questions (plan row is kept). */
export async function deleteSurvey(id: string): Promise<boolean> {
  const res = await apiFetch(`/surveys/${id}`, { method: 'DELETE' });
  if (res.status === 404) return false;
  if (!res.ok) await readError(res, 'Could not delete survey');
  return true;
}

export async function updateSurveyDescription(
  id: string,
  description: string
): Promise<Survey | null> {
  const res = await apiFetch(`/surveys/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ description })
  });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not update survey description');
  return mapSurvey((await res.json()) as ApiSurvey);
}

export async function addSection(
  surveyId: string,
  title: string,
  description?: string
): Promise<Section> {
  const res = await apiFetch(`/surveys/${surveyId}/sections`, {
    method: 'POST',
    body: JSON.stringify({
      title,
      description: description ?? null
    })
  });
  if (!res.ok) await readError(res, 'Could not add section');
  return mapSection((await res.json()) as ApiSection);
}

export async function updateSection(
  surveyId: string,
  sectionId: string,
  data: { title?: string; description?: string }
): Promise<Section | null> {
  const body: Record<string, unknown> = {};
  if (data.title !== undefined) body.title = data.title;
  if (data.description !== undefined) body.description = data.description;
  const res = await apiFetch(`/surveys/${surveyId}/sections/${sectionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not update section');
  return mapSection((await res.json()) as ApiSection);
}

export async function deleteSection(
  surveyId: string,
  sectionId: string
): Promise<boolean> {
  const res = await apiFetch(`/surveys/${surveyId}/sections/${sectionId}`, {
    method: 'DELETE'
  });
  if (res.status === 404) return false;
  if (!res.ok) await readError(res, 'Could not delete section');
  return true;
}

export async function reorderSections(
  surveyId: string,
  sectionIds: string[]
): Promise<void> {
  const res = await apiFetch(`/surveys/${surveyId}/sections/reorder`, {
    method: 'POST',
    body: JSON.stringify({ section_ids: sectionIds })
  });
  if (!res.ok) await readError(res, 'Could not reorder sections');
}

export async function addQuestion(
  surveyId: string,
  sectionId: string,
  type: QuestionType,
  promptText: string
): Promise<Question> {
  const options =
    type === 'single_choice' ||
    type === 'multiple_choice' ||
    type === 'dropdown'
      ? [
          { id: crypto.randomUUID(), label: 'Option 1', value: 'option_1' },
          { id: crypto.randomUUID(), label: 'Option 2', value: 'option_2' }
        ]
      : null;
  const res = await apiFetch(`/surveys/${surveyId}/questions`, {
    method: 'POST',
    body: JSON.stringify({
      section_id: sectionId,
      type,
      prompt_text: promptText,
      is_required: false,
      options
    })
  });
  if (!res.ok) await readError(res, 'Could not add question');
  return mapQuestion((await res.json()) as ApiQuestion);
}

export async function updateQuestion(
  surveyId: string,
  questionId: string,
  data: Partial<
    Pick<
      Question,
      | 'promptText'
      | 'helpText'
      | 'isRequired'
      | 'type'
      | 'options'
      | 'validationRules'
      | 'conditionalLogic'
    >
  >
): Promise<Question | null> {
  const body: Record<string, unknown> = {};
  if (data.promptText !== undefined) body.prompt_text = data.promptText;
  if (data.helpText !== undefined) body.help_text = data.helpText;
  if (data.isRequired !== undefined) body.is_required = data.isRequired;
  if (data.type !== undefined) body.type = data.type;
  if (data.options !== undefined) body.options = data.options;
  if (data.conditionalLogic !== undefined) {
    body.conditional_logic = data.conditionalLogic
      ? {
          operator: data.conditionalLogic.operator,
          rules: data.conditionalLogic.rules.map((r) => ({
            question_id: r.questionId,
            op: r.op,
            value: r.value
          }))
        }
      : null;
  }
  if (data.validationRules !== undefined) {
    body.validation_rules = data.validationRules
      ? {
          min: data.validationRules.min,
          max: data.validationRules.max,
          min_length: data.validationRules.minLength,
          max_length: data.validationRules.maxLength,
          regex: data.validationRules.regex
        }
      : null;
  }
  const res = await apiFetch(`/surveys/${surveyId}/questions/${questionId}`, {
    method: 'PATCH',
    body: JSON.stringify(body)
  });
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not update question');
  return mapQuestion((await res.json()) as ApiQuestion);
}

export async function deleteQuestion(
  surveyId: string,
  questionId: string
): Promise<boolean> {
  const res = await apiFetch(`/surveys/${surveyId}/questions/${questionId}`, {
    method: 'DELETE'
  });
  if (res.status === 404) return false;
  if (!res.ok) await readError(res, 'Could not delete question');
  return true;
}

export async function reorderQuestions(
  surveyId: string,
  sectionId: string,
  questionIds: string[]
): Promise<void> {
  const res = await apiFetch(`/surveys/${surveyId}/questions/reorder`, {
    method: 'POST',
    body: JSON.stringify({
      section_id: sectionId,
      question_ids: questionIds
    })
  });
  if (!res.ok) await readError(res, 'Could not reorder questions');
}

/** Hard-replace all sections/questions from the linked plan (BLD-01). */
export async function generateSurveyDraft(surveyId: string): Promise<Survey> {
  const res = await apiFetch(
    `/surveys/${surveyId}/generate`,
    { method: 'POST' },
    AI_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'AI could not generate the survey draft');
  const payload = (await res.json()) as ApiGenerateResponse;
  return mapSurvey(payload.survey);
}

/** Hard-replace one section's questions (BLD-02). */
export async function regenerateSection(
  surveyId: string,
  sectionId: string
): Promise<Survey> {
  const res = await apiFetch(
    `/surveys/${surveyId}/sections/${sectionId}/regenerate`,
    { method: 'POST' },
    AI_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'AI could not regenerate the section');
  const payload = (await res.json()) as ApiGenerateResponse;
  return mapSurvey(payload.survey);
}
