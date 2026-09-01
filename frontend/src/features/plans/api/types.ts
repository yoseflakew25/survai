// ============================================================
// Plan Types — mirrors plan.md §6 survey_plans table
// ============================================================

export type PlanStatus = 'draft' | 'approved';

export interface ProposedSection {
  title: string;
  rationale: string;
}

export interface Plan {
  id: string;
  createdBy: string;
  organizationId: string | null;
  researchGoal: string;
  objectives: string[];
  researchQuestions: string[];
  targetRespondents: string[];
  proposedSections: ProposedSection[];
  estimatedLengthMinutes: number | null;
  status: PlanStatus;
  aiGenerationMeta: {
    model: string;
    promptVersion: string;
    requestId: string;
    latencyMs: number;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanListResponse {
  plans: Plan[];
  total: number;
}

export interface PlanCreatePayload {
  researchGoal: string;
}

export interface PlanUpdatePayload {
  researchGoal?: string;
  objectives?: string[];
  researchQuestions?: string[];
  targetRespondents?: string[];
  proposedSections?: ProposedSection[];
  estimatedLengthMinutes?: number | null;
  status?: PlanStatus;
}

// AI generation output shape (plan.md §8 schemas)
export interface SurveyPlanOutput {
  objectives: string[];
  researchQuestions: string[];
  targetRespondents: string[];
  proposedSections: ProposedSection[];
  estimatedLengthMinutes: number;
  notes: string | null;
}
