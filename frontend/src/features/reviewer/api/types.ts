// ============================================================
// Reviewer Types — mirrors plan.md §6 reviewer_reports/reviewer_findings
// ============================================================

export type FindingIssueType =
  | 'leading_wording'
  | 'double_barreled'
  | 'ambiguous'
  | 'objective_misalignment'
  | 'other';

export type FindingStatus = 'open' | 'accepted' | 'dismissed';

export interface ReviewerFinding {
  id: string;
  reviewerReportId: string;
  questionId: string | null;
  questionText: string | null;
  sectionTitle: string | null;
  issueType: FindingIssueType;
  explanation: string;
  suggestedRewrite: string | null;
  status: FindingStatus;
  createdAt: string;
}

export interface ReviewerReport {
  id: string;
  surveyId: string;
  overallQualityScore: number | null;
  estimatedCompletionMinutes: number | null;
  requiredQuestionCount: number | null;
  scoreCriteria: ScoreCriterion[];
  findings: ReviewerFinding[];
  aiGenerationMeta: {
    model: string;
    promptVersion: string;
    latencyMs: number;
  } | null;
  notes?: string | null;
  createdAt: string;
}

export interface ScoreCriterion {
  label: string;
  score: number; // 1-5
  description: string;
}

export interface ReviewTriggerResponse {
  reportId: string;
  status: 'processing' | 'completed';
}

// Issue type metadata for UI
export interface IssueTypeMeta {
  type: FindingIssueType;
  label: string;
  description: string;
  color: string;
}

export const ISSUE_TYPES: IssueTypeMeta[] = [
  {
    type: 'leading_wording',
    label: 'Leading Wording',
    description: 'Question phrasing suggests a particular answer',
    color: 'text-orange-600 dark:text-orange-400'
  },
  {
    type: 'double_barreled',
    label: 'Double-Barreled',
    description: 'Question asks about two different things at once',
    color: 'text-amber-600 dark:text-amber-400'
  },
  {
    type: 'ambiguous',
    label: 'Ambiguous',
    description: 'Question could be interpreted in multiple ways',
    color: 'text-yellow-600 dark:text-yellow-400'
  },
  {
    type: 'objective_misalignment',
    label: 'Objective Misalignment',
    description: 'Question does not clearly serve a stated objective',
    color: 'text-blue-600 dark:text-blue-400'
  },
  {
    type: 'other',
    label: 'Other Issue',
    description: 'General quality concern',
    color: 'text-muted-foreground'
  }
];

export function getIssueTypeMeta(type: FindingIssueType): IssueTypeMeta {
  return ISSUE_TYPES.find((t) => t.type === type) ?? ISSUE_TYPES[4];
}
