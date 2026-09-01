import { queryOptions } from '@tanstack/react-query';
import { getSurveysList } from './service';
import type { SurveyListFilters } from './types';

export const surveyListKeys = {
  all: ['survey-list'] as const,
  list: (filters: SurveyListFilters) => [...surveyListKeys.all, 'list', filters] as const
};

export const surveysListQueryOptions = (filters: SurveyListFilters) =>
  queryOptions({
    queryKey: surveyListKeys.list(filters),
    queryFn: () => getSurveysList(filters)
  });
