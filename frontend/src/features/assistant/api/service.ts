import {
  apiErrorMessage,
  apiFetch,
  toUserFacingError
} from '@/lib/api';

import type {
  AssistantCitation,
  AssistantMessage,
  AssistantSendResult,
  AssistantThread,
  AssistantThreadList
} from './types';

async function readError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(
    toUserFacingError(new Error(apiErrorMessage(data, fallback)), fallback)
  );
}

type ApiThread = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ApiCitation = {
  chunk_id?: string | null;
  source_type?: string;
  source_id?: string;
  survey_id?: string | null;
  title?: string;
  href?: string | null;
  metric_refs?: string[];
  tools?: string[];
};

type ApiMessage = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  citations: ApiCitation[] | null;
  created_at: string;
};

function mapCitation(c: ApiCitation): AssistantCitation {
  return {
    chunkId: c.chunk_id ?? null,
    sourceType: c.source_type ?? 'unknown',
    sourceId: c.source_id,
    surveyId: c.survey_id,
    title: c.title ?? 'Source',
    href: c.href,
    metricRefs: c.metric_refs,
    tools: c.tools
  };
}

function mapThread(t: ApiThread): AssistantThread {
  return {
    id: t.id,
    title: t.title,
    createdAt: t.created_at,
    updatedAt: t.updated_at
  };
}

function mapMessage(m: ApiMessage): AssistantMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    citations: m.citations?.map(mapCitation) ?? null,
    createdAt: m.created_at
  };
}

export async function listThreads(): Promise<AssistantThreadList> {
  const res = await apiFetch('/assistant/threads');
  if (!res.ok) await readError(res, 'Could not load threads');
  const data = (await res.json()) as {
    threads: ApiThread[];
    total: number;
  };
  return {
    threads: data.threads.map(mapThread),
    total: data.total
  };
}

export async function createThread(title?: string): Promise<AssistantThread> {
  const res = await apiFetch('/assistant/threads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: title ?? null })
  });
  if (!res.ok) await readError(res, 'Could not create thread');
  return mapThread((await res.json()) as ApiThread);
}

export async function updateThread(
  threadId: string,
  title: string
): Promise<AssistantThread> {
  const res = await apiFetch(`/assistant/threads/${threadId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title })
  });
  if (!res.ok) await readError(res, 'Could not rename thread');
  return mapThread((await res.json()) as ApiThread);
}

export async function deleteThread(threadId: string): Promise<void> {
  const res = await apiFetch(`/assistant/threads/${threadId}`, {
    method: 'DELETE'
  });
  if (!res.ok) await readError(res, 'Could not delete thread');
}

export async function listMessages(
  threadId: string
): Promise<AssistantMessage[]> {
  const res = await apiFetch(`/assistant/threads/${threadId}/messages`);
  if (!res.ok) await readError(res, 'Could not load messages');
  const data = (await res.json()) as { messages: ApiMessage[] };
  return data.messages.map(mapMessage);
}

export async function sendMessage(
  threadId: string,
  content: string
): Promise<AssistantSendResult> {
  const res = await apiFetch(`/assistant/threads/${threadId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });
  if (!res.ok) await readError(res, 'Could not send message');
  const data = (await res.json()) as {
    thread: ApiThread;
    messages: ApiMessage[];
  };
  return {
    thread: mapThread(data.thread),
    messages: data.messages.map(mapMessage)
  };
}

export async function reindexKnowledge(): Promise<{
  surveys: number;
  reports: number;
  reviews: number;
}> {
  const res = await apiFetch('/assistant/knowledge/reindex', {
    method: 'POST'
  });
  if (!res.ok) await readError(res, 'Could not reindex knowledge');
  return (await res.json()) as {
    surveys: number;
    reports: number;
    reviews: number;
  };
}
