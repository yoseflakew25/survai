import type { QuestionType } from '@/features/builder/api/types';

export type RespondentStatus = 'completed' | 'partial';

export interface Respondent {
  id: string;
  name: string;
  email: string;
  status: RespondentStatus;
  submittedAt: string; // ISO
  durationSeconds: number;
}

export interface RespondentsFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: RespondentStatus;
  sort?: string;
  /** Analytics drill-down: question id the answer was given to */
  question?: string;
  /** Analytics drill-down: answer label to match */
  answer?: string;
}

/** Describes the drill-down filter applied by an analytics chart click. */
export interface ActiveRespondentFilter {
  questionId: string;
  questionText: string;
  answer: string;
  count: number;
}

export interface RespondentsSummary {
  responses: number;
  completed: number;
  partial: number;
  avgDurationSeconds: number;
}

export interface RespondentsResponse {
  surveyId: string;
  total: number;
  respondents: Respondent[];
  summary: RespondentsSummary;
  /** Present when the list is filtered by an analytics answer */
  activeFilter?: ActiveRespondentFilter;
}

export interface RespondentAnswer {
  questionId: string;
  sectionTitle: string;
  promptText: string;
  helpText: string | null;
  questionType: QuestionType;
  answered: boolean;
  /**
   * single_choice/dropdown → label string;
   * multiple_choice → label array;
   * rating_scale/number → number;
   * text/date → string
   */
  value: string | string[] | number | null;
  /** For rating_scale: the top of the scale, otherwise null */
  scaleMax: number | null;
}

export interface RespondentDetail extends Respondent {
  surveyTitle: string;
  surveyStatus: string;
  anonymousCollection: boolean;
  /** Flat list in survey section/question order */
  answers: RespondentAnswer[];
}
