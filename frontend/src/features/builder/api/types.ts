// ============================================================
// Builder Types — mirrors plan.md §6 surveys/sections/questions
// ============================================================

export type SurveyStatus = 'draft' | 'published' | 'closed' | 'archived';

export type QuestionType =
  | 'short_text'
  | 'long_text'
  | 'single_choice'
  | 'multiple_choice'
  | 'dropdown'
  | 'rating_scale'
  | 'number'
  | 'date';

export type QuestionSource = 'ai_generated' | 'manual' | 'ai_edited';

export interface QuestionOption {
  id: string;
  label: string;
  value: string;
}

export interface ValidationRules {
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  regex?: string;
}

export interface ConditionalRule {
  questionId: string;
  op: 'eq' | 'neq' | 'gt' | 'lt' | 'contains';
  value: string | number;
}

export interface ConditionalLogic {
  operator: 'AND' | 'OR';
  rules: ConditionalRule[];
}

export interface Question {
  id: string;
  sectionId: string;
  surveyId: string;
  type: QuestionType;
  promptText: string;
  helpText: string | null;
  isRequired: boolean;
  orderIndex: number;
  options: QuestionOption[] | null;
  validationRules: ValidationRules | null;
  conditionalLogic: ConditionalLogic | null;
  /** BLD-04 — AI/manual draft not yet written to the question row. */
  pendingConditionalLogic?: ConditionalLogic | null;
  source: QuestionSource;
  createdAt: string;
  updatedAt: string;
}

export interface Section {
  id: string;
  surveyId: string;
  title: string;
  description: string | null;
  orderIndex: number;
  questions: Question[];
  createdAt: string;
  updatedAt: string;
}

export interface Survey {
  id: string;
  planId: string | null;
  organizationId: string | null;
  createdBy: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  anonymousCollection: boolean;
  currentVersionId: string | null;
  sections: Section[];
  createdAt: string;
  updatedAt: string;
}

export interface SurveyListResponse {
  surveys: Survey[];
  total: number;
}

export interface GenerateSurveyPayload {
  planId: string;
}

export interface RegenerateSectionPayload {
  sectionId: string;
}

// AI draft output shape (plan.md §8)
export interface DraftQuestion {
  promptText: string;
  type: QuestionType;
  options: string[] | null;
  isRequired: boolean;
  helpText: string | null;
}

export interface DraftSection {
  title: string;
  questions: DraftQuestion[];
}

export interface SurveyDraftOutput {
  sections: DraftSection[];
}

// Question type metadata for the UI
export interface QuestionTypeMeta {
  type: QuestionType;
  label: string;
  description: string;
  icon: string;
  hasOptions: boolean;
  hasScale: boolean;
}

export const QUESTION_TYPES: QuestionTypeMeta[] = [
  {
    type: 'short_text',
    label: 'Short Text',
    description: 'Single-line text response',
    icon: 'text',
    hasOptions: false,
    hasScale: false
  },
  {
    type: 'long_text',
    label: 'Long Text',
    description: 'Multi-line text response',
    icon: 'text',
    hasOptions: false,
    hasScale: false
  },
  {
    type: 'single_choice',
    label: 'Single Choice',
    description: 'Select one option from a list',
    icon: 'circle',
    hasOptions: true,
    hasScale: false
  },
  {
    type: 'multiple_choice',
    label: 'Multiple Choice',
    description: 'Select multiple options',
    icon: 'check',
    hasOptions: true,
    hasScale: false
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    description: 'Select from a dropdown menu',
    icon: 'chevronDown',
    hasOptions: true,
    hasScale: false
  },
  {
    type: 'rating_scale',
    label: 'Rating Scale',
    description: 'Numeric scale (e.g., 1-5)',
    icon: 'star',
    hasOptions: false,
    hasScale: true
  },
  {
    type: 'number',
    label: 'Number',
    description: 'Numeric input',
    icon: 'code',
    hasOptions: false,
    hasScale: false
  },
  {
    type: 'date',
    label: 'Date',
    description: 'Date picker',
    icon: 'calendar',
    hasOptions: false,
    hasScale: false
  }
];

export function getQuestionTypeMeta(type: QuestionType): QuestionTypeMeta {
  return QUESTION_TYPES.find((qt) => qt.type === type) ?? QUESTION_TYPES[0];
}
