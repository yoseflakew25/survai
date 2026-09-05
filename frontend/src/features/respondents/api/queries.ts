import { queryOptions } from '@tanstack/react-query';
import { getRespondents, getRespondentDetail } from './service';
import type { RespondentsFilters } from './types';

export const respondentsKeys = {
  all: ['respondents'] as const,
  list: (surveyId: string, filters: RespondentsFilters) =>
    [...respondentsKeys.all, 'list', surveyId, filters] as const,
  detail: (surveyId: string, respondentId: string) =>
    [...respondentsKeys.all, 'detail', surveyId, respondentId] as const
};

export const respondentsOptions = (surveyId: string, filters: RespondentsFilters = {}) =>
  queryOptions({
    queryKey: respondentsKeys.list(surveyId, filters),
    queryFn: () => getRespondents(surveyId, filters),
    enabled: !!surveyId
  });

export const respondentDetailOptions = (surveyId: string, respondentId: string) =>
  queryOptions({
    queryKey: respondentsKeys.detail(surveyId, respondentId),
    queryFn: () => getRespondentDetail(surveyId, respondentId),
    enabled: !!surveyId && !!respondentId
  });
