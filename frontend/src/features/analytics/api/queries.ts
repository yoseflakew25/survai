import { queryOptions } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getQuestionDistributions,
  getSavedAnalyses
} from './service';

export const analyticsKeys = {
  all: ['analytics'] as const,
  summary: (surveyId: string) => [...analyticsKeys.all, 'summary', surveyId] as const,
  distributions: (surveyId: string) =>
    [...analyticsKeys.all, 'distributions', surveyId] as const,
  crossTab: (surveyId: string, qA: string, qB: string) =>
    [...analyticsKeys.all, 'crosstab', surveyId, qA, qB] as const,
  saved: (surveyId: string) => [...analyticsKeys.all, 'saved', surveyId] as const
};

export const analyticsSummaryOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.summary(surveyId),
    queryFn: () => getAnalyticsSummary(surveyId),
    enabled: !!surveyId
  });

export const distributionsOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.distributions(surveyId),
    queryFn: () => getQuestionDistributions(surveyId),
    enabled: !!surveyId
  });

export const savedAnalysesOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.saved(surveyId),
    queryFn: () => getSavedAnalyses(surveyId),
    enabled: !!surveyId
  });
