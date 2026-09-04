import { queryOptions } from '@tanstack/react-query';
import { getReport } from './service';

export const reportKeys = {
  all: ['reports'] as const,
  detail: (surveyId: string) => [...reportKeys.all, 'detail', surveyId] as const
};

export const reportOptions = (surveyId: string) =>
  queryOptions({
    queryKey: reportKeys.detail(surveyId),
    queryFn: () => getReport(surveyId),
    enabled: !!surveyId
  });