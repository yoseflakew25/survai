import { queryOptions } from '@tanstack/react-query';
import {
  getAnalyticsSummary,
  getQuestionDistributions,
  getCrossTab,
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

// Default question pair used by the mock cross-tab view.
const DEFAULT_CROSSTAB_IDS = { questionAId: 'q_001', questionBId: 'q_007' } as const;

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

export const crossTabOptions = (
  surveyId: string,
  questionAId = DEFAULT_CROSSTAB_IDS.questionAId,
  questionBId = DEFAULT_CROSSTAB_IDS.questionBId
) =>
  queryOptions({
    queryKey: analyticsKeys.crossTab(surveyId, questionAId, questionBId),
    queryFn: () => getCrossTab(surveyId, questionAId, questionBId),
    enabled: !!surveyId
  });

export const savedAnalysesOptions = (surveyId: string) =>
  queryOptions({
    queryKey: analyticsKeys.saved(surveyId),
    queryFn: () => getSavedAnalyses(surveyId),
    enabled: !!surveyId
  });
