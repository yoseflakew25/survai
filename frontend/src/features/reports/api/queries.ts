import { queryOptions } from '@tanstack/react-query';
import { getLatestReport, getReportChat } from './service';

export const reportKeys = {
  all: ['reports'] as const,
  detail: (surveyId: string) => [...reportKeys.all, 'detail', surveyId] as const,
  chat: (reportId: string) => [...reportKeys.all, 'chat', reportId] as const
};

export const reportOptions = (surveyId: string) =>
  queryOptions({
    queryKey: reportKeys.detail(surveyId),
    queryFn: () => getLatestReport(surveyId),
    enabled: !!surveyId
  });

export const reportChatOptions = (reportId: string | null) =>
  queryOptions({
    queryKey: reportKeys.chat(reportId ?? 'none'),
    queryFn: () => getReportChat(reportId!),
    enabled: !!reportId
  });
