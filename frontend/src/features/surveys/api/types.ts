export type SurveyStatus = 'draft' | 'published' | 'closed' | 'archived';

export interface SurveyListItem {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  sectionsCount: number;
  questionsCount: number;
  responsesCount: number;
  completionRate: number | null;
  lastResponseAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SurveyListFilters {
  search?: string;
  status?: SurveyStatus;
  sort?: string;
  page?: number;
  limit?: number;
}

export interface SurveyListResponse {
  surveys: SurveyListItem[];
  total: number;
}
