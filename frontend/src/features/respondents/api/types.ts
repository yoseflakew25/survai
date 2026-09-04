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
}
