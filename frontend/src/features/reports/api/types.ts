// ============================================================
// Reports Types — mirrors backend schemas/report.py
// ============================================================

export type ReportAudience = 'internal' | 'donor' | 'executive_summary';
export type ReportStatus = 'draft' | 'final';
export type ChatConfidence = 'grounded' | 'partial' | 'insufficient_data';

export interface ReportSection {
  id: string;
  title: string;
  content: string;
  metricRefs?: string[];
}

export interface ReportStats {
  responseCount: number;
  completionRate: number;
  avgCompletionMinutes: number | null;
  questionsCount: number;
}

export interface ReportIntegrity {
  matchesCurrentVersion: boolean;
  isStale: boolean;
  snapshotResponseCount: number;
  liveResponseCount: number | null;
  snapshotSurveyVersionId: string;
  currentSurveyVersionId: string | null;
}

export interface SurveyReport {
  id: string;
  surveyId: string;
  surveyVersionId: string;
  surveyTitle: string;
  title: string;
  audience: ReportAudience;
  status: ReportStatus;
  model: string | null;
  stats: ReportStats;
  sections: ReportSection[];
  integrity: ReportIntegrity;
  createdAt: string;
  updatedAt: string;
}

export interface ReportChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metricRefs: string[];
  confidence: ChatConfidence | null;
  createdAt: string;
}

export interface ExportResult {
  id: string;
  type: 'docx' | 'pdf' | 'csv' | 'markdown';
  status: string;
  contentText: string | null;
  fileUrl: string | null;
  createdAt: string;
}
