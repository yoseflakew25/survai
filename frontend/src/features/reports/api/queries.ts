import { queryOptions } from '@tanstack/react-query';
import { getLatestReport, getReport, getReportChat } from './service';

export const reportKeys = {
  all: ['reports'] as const,
  detail: (surveyId: string, reportId?: string | null) =>
    [...reportKeys.all, 'detail', surveyId, reportId ?? 'latest'] as const,
  chat: (reportId: string) => [...reportKeys.all, 'chat', reportId] as const
};

export const reportOptions = (
  surveyId: string,
  reportId?: string | null
) =>
  queryOptions({
    queryKey: reportKeys.detail(surveyId, reportId),
    queryFn: () =>
      reportId ? getReport(reportId) : getLatestReport(surveyId),
    enabled: !!surveyId
  });

export const reportChatOptions = (reportId: string | null) =>
  queryOptions({
    queryKey: reportKeys.chat(reportId ?? 'none'),
    queryFn: () => getReportChat(reportId!),
    enabled: !!reportId
  });
