import { queryOptions } from '@tanstack/react-query';
import { getCollectStats } from './service';

export const collectStatsKeys = {
  all: ['collect'] as const,
  stats: (surveyId: string) => [...collectStatsKeys.all, 'stats', surveyId] as const
};

export const collectStatsOptions = (surveyId: string) =>
  queryOptions({
    queryKey: collectStatsKeys.stats(surveyId),
    queryFn: () => getCollectStats(surveyId),
    enabled: !!surveyId
  });