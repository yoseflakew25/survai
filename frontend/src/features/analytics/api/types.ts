// ============================================================
// Analytics Types — mirrors plan.md §6 saved_analyses + §10 engine
// ============================================================

export interface Filter {
  questionId: string;
  op: 'eq' | 'in' | 'gt' | 'lt' | 'between';
  value: string | number | string[];
}

export interface MetricValue {
  key: string;
  label: string;
  value: number | string;
  unit: 'count' | 'percent' | 'mean' | 'median' | 'text';
}

export interface DistributionBucket {
  label: string;
  value: number;
  percent: number;
}

export interface QuestionDistribution {
  questionId: string;
  questionText: string;
  questionType: string;
  totalResponses: number;
  missingCount: number;
  buckets: DistributionBucket[];
}

export interface CrossTabCell {
  rowLabel: string;
  colLabel: string;
  count: number;
  percent: number;
}

export interface CrossTabResult {
  questionAId: string;
  questionAText: string;
  questionBId: string;
  questionBText: string;
  rowLabels: string[];
  colLabels: string[];
  cells: CrossTabCell[];
  totalResponses: number;
}

export interface AnalyticsSummary {
  surveyId: string;
  surveyVersionId: string;
  responseCount: number;
  completionRate: number;
  avgCompletionMinutes: number;
  metrics: MetricValue[];
}

export interface SavedAnalysis {
  id: string;
  surveyId: string;
  surveyVersionId: string;
  name: string;
  filters: Filter[];
  chartConfig: Record<string, unknown> | null;
  createdAt: string;
}

export interface AnalyticsQueryPayload {
  questionIds: string[];
  filters?: Filter[];
}

export interface CrossTabPayload {
  questionAId: string;
  questionBId: string;
  filters?: Filter[];
}

export interface AnalyticsListResponse {
  surveys: { id: string; title: string; responseCount: number }[];
  total: number;
}
