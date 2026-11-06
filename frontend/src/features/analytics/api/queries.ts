import { queryOptions } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getQuestionDistributions,
  getCrossTab,
  getSavedAnalyses
} from './service';
import type { Filter } from './types';

function filtersKey(filters: Filter[] = []) {
  return JSON.stringify(
    filters.map((f) => [f.questionId, f.op, f.value])
  );
}

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (surveyId: string) =>
    [...analyticsKeys.all, 'summary', surveyId] as const,
  distributions: (surveyId: string, filters: Filter[] = []) =>
    [...analyticsKeys.all, 'distributions', surveyId, filtersKey(filters)] as const,
  crossTab: (
    surveyId: string,
    qA: string,
    qB: string,
    filters: Filter[] = []
  ) =>
    [
      ...analyticsKeys.all,
      'crosstab',
      surveyId,
      qA,
      qB,
      filtersKey(filters)
    ] as const,
  saved: (surveyId: string) =>
    [...analyticsKeys.all, 'saved', surveyId] as const
};

export const analyticsSummaryOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.summary(surveyId),
    queryFn: () => getAnalyticsSummary(surveyId),
    enabled: !!surveyId
  });

export const distributionsOptions = (
  surveyId: string,
  filters: Filter[] = []
) =>
  queryOptions({
    queryKey: analyticsKeys.distributions(surveyId, filters),
    queryFn: () => getQuestionDistributions(surveyId, filters),
    enabled: !!surveyId
  });

export const crossTabOptions = (
  surveyId: string,
  questionAId: string,
  questionBId: string,
  filters: Filter[] = []
) =>
  queryOptions({
    queryKey: analyticsKeys.crossTab(
      surveyId,
      questionAId,
      questionBId,
      filters
    ),
    queryFn: () =>
      getCrossTab(surveyId, questionAId, questionBId, filters),
    enabled: !!surveyId && !!questionAId && !!questionBId
  });

export const savedAnalysesOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.saved(surveyId),
    queryFn: () => getSavedAnalyses(surveyId),
    enabled: !!surveyId
  });
