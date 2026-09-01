import { queryOptions } from '@tanstack/react-query';
import { getSurveys, getSurveyById } from './service';

// ============================================================
// Query Key Factories
// ============================================================

export const surveyKeys = {
  all: ['surveys'] as const,
  list: () => [...surveyKeys.all, 'list'] as const,
  detail: (id: string) => [...surveyKeys.all, 'detail', id] as const
};

// ============================================================
// Query Options
// ============================================================

export const surveysQueryOptions = () =>
  queryOptions({
    queryKey: surveyKeys.list(),
    queryFn: () => getSurveys()
  });

export const surveyByIdOptions = (id: string) =>
  queryOptions({
    queryKey: surveyKeys.detail(id),
    queryFn: () => getSurveyById(id),
    enabled: !!id
  });
