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

const STREAM_TIMEOUT_MS = 180_000;

export type AssistantStreamHandlers = {
  onStatus?: (stage: string) => void;
  onDelta?: (text: string) => void;
};

/** SSE send — status + progressive deltas; resolves with final messages. */
export async function sendMessageStream(
  threadId: string,
  content: string,
  handlers: AssistantStreamHandlers = {}
): Promise<AssistantSendResult> {
  const res = await apiFetch(
    `/assistant/threads/${threadId}/messages/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify({ content })
    },
    STREAM_TIMEOUT_MS
  );
  if (!res.ok) await readError(res, 'Could not send message');
  if (!res.body) {
    throw new Error('Assistant stream returned an empty body');
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: AssistantSendResult | null = null;
  let streamError: string | null = null;

  const consumeBlock = (block: string) => {
    const lines = block.split('\n');
    let event = 'message';
    const dataLines: string[] = [];
    for (const line of lines) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trim());
    }
    if (!dataLines.length) return;
    let payload: unknown;
    try {
      payload = JSON.parse(dataLines.join('\n'));
    } catch {
      return;
    }
    if (event === 'status' && payload && typeof payload === 'object') {
      const stage = (payload as { stage?: string }).stage;
      if (stage) handlers.onStatus?.(stage);
    } else if (event === 'delta' && payload && typeof payload === 'object') {
      const text = (payload as { text?: string }).text;
      if (text) handlers.onDelta?.(text);
    } else if (event === 'done' && payload && typeof payload === 'object') {
      const data = payload as { thread: ApiThread; messages: ApiMessage[] };
      result = {
        thread: mapThread(data.thread),
        messages: data.messages.map(mapMessage)
      };
    } else if (event === 'error' && payload && typeof payload === 'object') {
      streamError =
        (payload as { detail?: string }).detail || 'Assistant stream failed';
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const block of parts) {
      if (block.trim()) consumeBlock(block);
    }
  }
  if (buffer.trim()) consumeBlock(buffer);

  if (streamError) throw new Error(streamError);
  if (!result) throw new Error('Assistant stream ended without a reply');
  return result;
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
