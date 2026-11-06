export type AssistantRole = 'user' | 'assistant' | 'system';

export interface AssistantCitation {
  chunkId: string | null;
  sourceType: string;
  sourceId?: string;
  surveyId?: string | null;
  title: string;
  href?: string | null;
  metricRefs?: string[];
  tools?: string[];
}

export interface AssistantThread {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssistantMessage {
  id: string;
  role: AssistantRole;
  content: string;
  citations: AssistantCitation[] | null;
  createdAt: string;
}

export interface AssistantThreadList {
  threads: AssistantThread[];
  total: number;
}

export interface AssistantSendResult {
  thread: AssistantThread;
  messages: AssistantMessage[];
}
