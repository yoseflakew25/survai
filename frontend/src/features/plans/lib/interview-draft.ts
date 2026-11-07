import type {
  PlanInterviewBrief,
  PlanInterviewMessage
} from '../api/types';

const DRAFT_KEY = 'planInterviewDraft:v1';

export type PlanInterviewDraft = {
  messages: PlanInterviewMessage[];
  brief: PlanInterviewBrief;
  researchGoalDraft: string;
  readyToGenerate: boolean;
  updatedAt: string;
};

export function loadInterviewDraft(): PlanInterviewDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlanInterviewDraft;
    if (!parsed || !Array.isArray(parsed.messages)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveInterviewDraft(draft: Omit<PlanInterviewDraft, 'updatedAt'>) {
  if (typeof window === 'undefined') return;
  try {
    const payload: PlanInterviewDraft = {
      ...draft,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — ignore.
  }
}

export function clearInterviewDraft() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}
