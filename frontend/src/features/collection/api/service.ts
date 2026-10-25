// ============================================================
// Collection Service — live public FastAPI (COL)
// ============================================================

import {
  API_BASE,
  apiErrorMessage,
  toUserFacingError
} from '@/lib/api';

import type {
  AnswerPayload,
  AnswerValue,
  PublicQuestion,
  PublicSection,
  PublicSurvey,
  Respondent
} from './types';
import type {
  QuestionOption,
  QuestionType,
  ValidationRules,
  ConditionalLogic
} from '@/features/builder/api/types';

const DEFAULT_TIMEOUT_MS = 30_000;

async function publicFetch(
  path: string,
  init: RequestInit = {},
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      signal: controller.signal
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error(
        'The server took too long to respond. Try again in a moment.'
      );
    }
    throw new Error(
      toUserFacingError(err, 'Something went wrong. Please try again.')
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  const detail = apiErrorMessage(data, '');
  if (detail) {
    throw new Error(detail);
  }
  if (res.status >= 500) {
    throw new Error(
      'Something went wrong on the server. Please try again in a moment.'
    );
  }
  throw new Error(fallback);
}

type ApiQuestion = {
  id: string;
  type: QuestionType;
  prompt_text: string;
  help_text: string | null;
  is_required: boolean;
  order_index: number;
  options: QuestionOption[] | null;
  validation_rules: ValidationRules | null;
  conditional_logic: ConditionalLogic | null;
};

type ApiSection = {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
  questions: ApiQuestion[];
};

type ApiPublicSurvey = {
  id: string;
  survey_version_id: string;
  title: string;
  description: string | null;
  sections: ApiSection[];
};

type ApiRespondent = {
  id: string;
  survey_version_id: string;
  session_token: string;
  is_anonymous: boolean;
  started_at: string;
  completed_at: string | null;
};

function mapQuestion(q: ApiQuestion): PublicQuestion {
  return {
    id: q.id,
    type: q.type,
    promptText: q.prompt_text,
    helpText: q.help_text,
    isRequired: q.is_required,
    orderIndex: q.order_index,
    options: q.options,
    validationRules: q.validation_rules,
    conditionalLogic: q.conditional_logic
  };
}

function mapSection(s: ApiSection): PublicSection {
  return {
    id: s.id,
    title: s.title,
    description: s.description,
    orderIndex: s.order_index,
    questions: (s.questions ?? []).map(mapQuestion)
  };
}

function mapSurvey(s: ApiPublicSurvey): PublicSurvey {
  return {
    id: s.id,
    surveyVersionId: s.survey_version_id,
    title: s.title,
    description: s.description,
    sections: (s.sections ?? [])
      .map(mapSection)
      .toSorted((a, b) => a.orderIndex - b.orderIndex)
  };
}

function mapRespondent(r: ApiRespondent): Respondent {
  return {
    id: r.id,
    surveyVersionId: r.survey_version_id,
    sessionToken: r.session_token,
    isAnonymous: r.is_anonymous,
    startedAt: r.started_at,
    completedAt: r.completed_at
  };
}

export async function getPublicSurvey(
  versionId: string
): Promise<PublicSurvey | null> {
  const res = await publicFetch(`/public/surveys/${versionId}`);
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not load survey');
  return mapSurvey((await res.json()) as ApiPublicSurvey);
}

/** One-shot: create a completed response only (no partial rows). */
export async function submitSurvey(
  versionId: string,
  answers: AnswerPayload[]
): Promise<Respondent> {
  const res = await publicFetch(`/public/surveys/${versionId}/submit`, {
    method: 'POST',
    body: JSON.stringify({
      answers: answers.map((a) => ({
        question_id: a.questionId,
        value: a.value as AnswerValue
      }))
    })
  });
  if (!res.ok) await readError(res, 'Could not submit survey');
  return mapRespondent((await res.json()) as ApiRespondent);
}
