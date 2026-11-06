import { queryOptions } from '@tanstack/react-query';

import { listMessages, listThreads } from './service';

export const assistantKeys = {
  all: ['assistant'] as const,
  threads: () => [...assistantKeys.all, 'threads'] as const,
  messages: (threadId: string) =>
    [...assistantKeys.all, 'messages', threadId] as const
};

export function assistantThreadsOptions() {
  return queryOptions({
    queryKey: assistantKeys.threads(),
    queryFn: listThreads
  });
}

export function assistantMessagesOptions(threadId: string | null) {
  return queryOptions({
    queryKey: assistantKeys.messages(threadId ?? 'none'),
    queryFn: () => listMessages(threadId!),
    enabled: Boolean(threadId)
  });
}
