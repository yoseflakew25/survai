// ============================================================
// Collection Types — public respondent-facing survey (plan.md §6)
// ============================================================

import type {
  QuestionType,
  QuestionOption,
  ValidationRules,
  ConditionalLogic
} from '@/features/builder/api/types';

// ---- Public survey snapshot (from survey_versions.structure_snapshot) ----

export interface PublicQuestion {
  id: string;
  type: QuestionType;
  promptText: string;
  helpText: string | null;
  isRequired: boolean;
  orderIndex: number;
  options: QuestionOption[] | null;
  validationRules: ValidationRules | null;
  conditionalLogic: ConditionalLogic | null;
}

export interface PublicSection {
  id: string;
  title: string;
  description: string | null;
  orderIndex: number;
  questions: PublicQuestion[];
}

export interface PublicSurvey {
  id: string;
  surveyVersionId: string;
  title: string;
  description: string | null;
  sections: PublicSection[];
}

// ---- Answer types ----

export type AnswerValue = string | number | string[] | null;

export interface AnswerPayload {
  questionId: string;
  value: AnswerValue;
}

// ---- Respondent session ----

export interface Respondent {
  id: string;
  surveyVersionId: string;
  sessionToken: string;
  isAnonymous: boolean;
  startedAt: string;
  completedAt: string | null;
}

// ---- Collection state ----

export type CollectionStatus = 'loading' | 'in_progress' | 'submitting' | 'completed' | 'error';
