// ============================================================
// Reports Types — mirrors plan.md §6 ai_reports
// ============================================================

export interface ReportSection {
  id: string;
  title: string;
  content: string;
}

export interface ReportStats {
  responseCount: number;
  completionRate: number; // percentage, e.g. 78.3
  avgCompletionMinutes: number;
  questionsCount: number;
}

export interface SurveyReport {
  id: string;
  surveyId: string;
  surveyTitle: string;
  model: string;
  stats: ReportStats;
  sections: ReportSection[];
  createdAt: string;
  updatedAt: string;
}