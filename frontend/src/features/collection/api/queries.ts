import { queryOptions } from '@tanstack/react-query';
import { getPublicSurvey } from './service';

export const collectionKeys = {
  all: ['collection'] as const,
  survey: (versionId: string) => [...collectionKeys.all, 'survey', versionId] as const
};

export const publicSurveyOptions = (versionId: string) =>
  queryOptions({
    queryKey: collectionKeys.survey(versionId),
    queryFn: () => getPublicSurvey(versionId),
    enabled: !!versionId
  });
