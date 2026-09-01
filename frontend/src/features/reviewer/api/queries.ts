import { queryOptions } from '@tanstack/react-query';
import { getLatestReview } from './service';

export const reviewerKeys = {
  all: ['reviewer'] as const,
  latest: (surveyId: string) => [...reviewerKeys.all, 'latest', surveyId] as const
};

export const latestReviewOptions = (surveyId: string) =>
  queryOptions({
    queryKey: reviewerKeys.latest(surveyId),
    queryFn: () => getLatestReview(surveyId),
    enabled: !!surveyId
  });
