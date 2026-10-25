// ============================================================
// Respondents Service — live FastAPI
// ============================================================

import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  Respondent,
  RespondentAnswer,
  RespondentDetail,
  RespondentsFilters,
  RespondentsResponse,
  RespondentStatus
} from './types';
import type { QuestionType } from '@/features/builder/api/types';

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  const detail = apiErrorMessage(data, '');
  if (detail) throw new Error(detail);
  if (res.status >= 500) {
    throw new Error(
      'Something went wrong on the server. Please try again in a moment.'
    );
  }
  throw new Error(
    toUserFacingError(new Error(fallback), fallback)
  );
}

type ApiListItem = {
  id: string;
  name: string;
  email: string;
  status: RespondentStatus;
  submitted_at: string;
  duration_seconds: number;
  survey_version_id: string;
};

type ApiListResponse = {
  survey_id: string;
  total: number;
  respondents: ApiListItem[];
  summary: {
    responses: number;
    completed: number;
    partial: number;
    avg_duration_seconds: number;
  };
  active_filter?: {
    question_id: string;
    question_text: string;
    answer: string;
    count: number;
  } | null;
};

type ApiAnswer = {
  question_id: string;
  section_title: string;
  prompt_text: string;
  help_text: string | null;
  question_type: string;
  answered: boolean;
  value: string | string[] | number | null;
  scale_max: number | null;
};

type ApiDetail = {
  id: string;
  name: string;
  email: string;
  status: RespondentStatus;
  submitted_at: string;
  duration_seconds: number;
  survey_id: string;
  survey_version_id: string;
  survey_title: string;
  survey_status: string;
  anonymous_collection: boolean;
  answers: ApiAnswer[];
};

function mapRespondent(r: ApiListItem): Respondent {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    status: r.status,
    submittedAt: r.submitted_at,
    durationSeconds: r.duration_seconds
  };
}

function mapAnswer(a: ApiAnswer): RespondentAnswer {
  return {
    questionId: a.question_id,
    sectionTitle: a.section_title,
    promptText: a.prompt_text,
    helpText: a.help_text,
    questionType: a.question_type as QuestionType,
    answered: a.answered,
    value: a.value,
    scaleMax: a.scale_max
  };
}

export async function getRespondents(
  surveyId: string,
  filters: RespondentsFilters = {}
): Promise<RespondentsResponse> {
  const params = new URLSearchParams();
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 10));
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.sort) params.set('sort', filters.sort);
  if (filters.question) params.set('question', filters.question);
  if (filters.answer) params.set('answer', filters.answer);

  const res = await apiFetch(
    `/surveys/${surveyId}/respondents?${params.toString()}`
  );
  if (!res.ok) await readError(res, 'Could not load respondents');
  const data = (await res.json()) as ApiListResponse;

  return {
    surveyId: data.survey_id,
    total: data.total,
    respondents: data.respondents.map(mapRespondent),
    summary: {
      responses: data.summary.responses,
      completed: data.summary.completed,
      partial: data.summary.partial,
      avgDurationSeconds: data.summary.avg_duration_seconds
    },
    ...(data.active_filter
      ? {
          activeFilter: {
            questionId: data.active_filter.question_id,
            questionText: data.active_filter.question_text,
            answer: data.active_filter.answer,
            count: data.active_filter.count
          }
        }
      : {})
  };
}

export async function getRespondentDetail(
  surveyId: string,
  respondentId: string
): Promise<RespondentDetail | null> {
  const res = await apiFetch(
    `/surveys/${surveyId}/respondents/${respondentId}`
  );
  if (res.status === 404) return null;
  if (!res.ok) await readError(res, 'Could not load respondent');
  const d = (await res.json()) as ApiDetail;
  return {
    id: d.id,
    name: d.name,
    email: d.email,
    status: d.status,
    submittedAt: d.submitted_at,
    durationSeconds: d.duration_seconds,
    surveyId: d.survey_id,
    surveyTitle: d.survey_title,
    surveyStatus: d.survey_status,
    anonymousCollection: d.anonymous_collection,
    answers: d.answers.map(mapAnswer)
  };
}
