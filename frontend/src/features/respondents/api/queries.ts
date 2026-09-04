import { queryOptions } from '@tanstack/react-query';
import { getRespondents } from './service';
import type { RespondentsFilters } from './types';

export const respondentsKeys = {
  all: ['respondents'] as const,
  list: (surveyId: string, filters: RespondentsFilters) =>
    [...respondentsKeys.all, 'list', surveyId, filters] as const
};

export const respondentsOptions = (surveyId: string, filters: RespondentsFilters = {}) =>
  queryOptions({
    queryKey: respondentsKeys.list(surveyId, filters),
    queryFn: () => getRespondents(surveyId, filters),
    enabled: !!surveyId
  });
