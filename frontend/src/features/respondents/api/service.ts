// ============================================================
// Respondents Service — Mock Data Layer
// Mirrors the responseCount in surveys mock data per survey id.
// Respondent answers are derived deterministically so drill-down
// (analytics chart -> respondents list) and the per-respondent
// detail page stay consistent across server prefetch + client.
// ============================================================

import { getQuestionDistributions } from '@/features/analytics/api/service';
import type { QuestionDistribution } from '@/features/analytics/api/types';
import { getSurveyById } from '@/features/builder/api/service';
import type { Question } from '@/features/builder/api/types';
import type {
  Respondent,
  RespondentAnswer,
  RespondentDetail,
  RespondentsFilters,
  RespondentsResponse,
  RespondentsSummary,
  RespondentStatus
} from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_RESPONSE_COUNTS: Record<string, number> = {
  sur_001: 142,
  sur_002: 0,
  sur_003: 89,
  sur_004: 67,
  sur_005: 0,
  sur_006: 203,
  sur_007: 56,
  sur_008: 0
};

// ---- Deterministic pseudo-random helpers (stable across server/client) ----

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST_NAMES = [
  'Amara', 'Liam', 'Zainab', 'Mateo', 'Aisha', 'Noah', 'Priya', 'Diego',
  'Fatima', 'Ethan', 'Hana', 'Lucas', 'Nadia', 'Omar', 'Maya', 'Kwame',
  'Sofia', 'Jonas', 'Leila', 'Marcus', 'Yusuf', 'Elena', 'Daniel', 'Ruth',
  'Samuel', 'Ines', 'Tariq', 'Grace', 'Emmanuel', 'Chloe', 'Ahmed', 'Laura',
  'Peter', 'Sana', 'Michael', 'Ada', 'James', 'Nina', 'David', 'Selam'
];

const LAST_NAMES = [
  'Okafor', 'Mensah', 'Hassan', 'Garcia', 'Abebe', 'Silva', 'Kumar', 'Diallo',
  'Haddad', 'Osei', 'Nakamura', 'Costa', 'Mohamed', 'Dube', 'Santos', 'Kimani',
  'Adeyemi', 'Moreno', 'Tesfaye', 'Schmidt', 'Onyeka', 'Rossi', 'Bekele', 'Sato',
  'Lopez', 'Nguyen', 'Dlamini', 'Parker', 'Alvarez', 'Kone', 'Fischer', 'Reyes',
  'Chen', 'Moyo', 'Andersson', 'Ibrahim', 'Torres', 'Ndlovu', 'Wilson', 'Assefa'
];

const DOMAINS = ['gmail.com', 'outlook.com', 'yahoo.com', 'proton.me', 'icloud.com'];

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z]/g, '');
}

function generateRespondents(surveyId: string): Respondent[] {
  const total = MOCK_RESPONSE_COUNTS[surveyId] ?? 0;
  if (total === 0) return [];

  const rand = mulberry32(hashString(surveyId));
  // Spread submissions across the ~2 weeks leading up to the demo "now"
  const latest = Date.UTC(2026, 8, 1, 12, 0, 0); // 2026-09-01T12:00:00Z
  const spreadMs = 14 * 24 * 60 * 60 * 1000;

  return Array.from({ length: total }, (_, i) => {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(rand() * LAST_NAMES.length)];
    const domain = DOMAINS[Math.floor(rand() * DOMAINS.length)];

    const suffix = rand() < 0.35 ? `${Math.floor(rand() * 90) + 10}` : '';
    const email = `${slugify(first)}.${slugify(last)}${suffix}@${domain}`;
    const submittedMs = latest - Math.floor(rand() * spreadMs);
    const durationSeconds = 180 + Math.floor(rand() * 1500);
    const status: RespondentStatus = rand() < 0.18 ? 'partial' : 'completed';

    return {
      id: `resp_${surveyId.slice(-4)}_${(i + 1).toString().padStart(3, '0')}`,
      name: `${first} ${last}`,
      email,
      status,
      submittedAt: new Date(submittedMs).toISOString(),
      durationSeconds
    };
  });
}

function summarize(respondents: Respondent[]): RespondentsSummary {
  if (respondents.length === 0) {
    return { responses: 0, completed: 0, partial: 0, avgDurationSeconds: 0 };
  }
  const completed = respondents.filter((r) => r.status === 'completed').length;
  const avgDurationSeconds = Math.round(
    respondents.reduce((sum, r) => sum + r.durationSeconds, 0) / respondents.length
  );
  return {
    responses: respondents.length,
    completed,
    partial: respondents.length - completed,
    avgDurationSeconds
  };
}

// ============================================================
// Answer derivation
// ------------------------------------------------------------
// Questions covered by the analytics mock use that distribution
// as ground truth (exact counts for single-choice/rating, seeded
// subsetting for multi-select). Everything else falls back to a
// stable per-question hash so answers are identical on every load.
// ============================================================

const TEXT_ANSWER_POOL = [
  'I think accessibility is the biggest barrier for me.',
  'The overall experience has improved compared to last time.',
  'Cost remains my main concern when making decisions.',
  'Scheduling flexibility would make things much easier.',
  'Staff communication could be clearer and more timely.',
  'The options available cover most of what I need.',
  'I would like more reminders and follow-ups.',
  'Waiting times are the thing I would change first.',
  'Everything was straightforward and easy to understand.',
  'I am happy with the current setup overall.'
];

const MULTI_CHOICE_OPTION_CHANCE_CAP = 0.92;

/**
 * Builds a respondentId -> chosen answer-label(s) map that reproduces the
 * analytics distribution for a question exactly (single-choice/rating) or
 * approximately (multiple-choice), keyed deterministically per respondent.
 */
function buildDistributionAnswerMap(
  respondentIds: string[],
  dist: QuestionDistribution
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const total = respondentIds.length;
  const missing = Math.max(0, total - dist.totalResponses);

  // Pick deterministic "skipped the question" respondents.
  const skip = new Set<string>();
  if (missing > 0) {
    const rand = mulberry32(hashString(`${dist.questionId}::missing`));
    const pool = [...respondentIds];
    while (skip.size < missing && pool.length > 0) {
      const idx = Math.floor(rand() * pool.length);
      skip.add(pool.splice(idx, 1)[0]);
    }
  }

  const answered = respondentIds.filter((id) => !skip.has(id));

  if (dist.questionType === 'multiple_choice') {
    const totalAnswered = dist.totalResponses || 1;
    for (const id of answered) {
      const selected: string[] = [];
      for (const bucket of dist.buckets) {
        const chance = Math.min(
          MULTI_CHOICE_OPTION_CHANCE_CAP,
          bucket.value / totalAnswered
        );
        const r = mulberry32(
          hashString(`${id}|${dist.questionId}|${bucket.label}`)
        )();
        if (r < chance) selected.push(bucket.label);
      }
      // Guarantee at least one selection for a respondent who answered.
      if (selected.length === 0) {
        const r = mulberry32(hashString(`${id}|${dist.questionId}|pick`))();
        selected.push(dist.buckets[Math.floor(r * dist.buckets.length)].label);
      }
      map.set(id, selected);
    }
    return map;
  }

  // Single-choice / rating: partition answered respondents into exact
  // bucket ranges in bucket order.
  let cursor = 0;
  for (const bucket of dist.buckets) {
    const slice = answered.slice(cursor, cursor + bucket.value);
    for (const id of slice) map.set(id, [bucket.label]);
    cursor += bucket.value;
  }
  return map;
}

/** Deterministic generic answer for builder questions outside the analytics set. */
function deriveGenericAnswer(question: Question, respondentId: string): string[] | number | string {
  const seed = hashString(`${respondentId}|${question.id}`);
  const rand = mulberry32(seed);
  const options = question.options ?? [];

  switch (question.type) {
    case 'single_choice':
    case 'dropdown': {
      if (options.length === 0) return '';
      return [options[Math.floor(rand() * options.length)].label];
    }
    case 'multiple_choice': {
      if (options.length === 0) return [];
      const shuffled = [...options].toSorted(
        () => mulberry32(seed + 1)() - 0.5
      );
      const take = 1 + Math.floor(rand() * Math.min(3, shuffled.length));
      return shuffled.slice(0, take).map((o) => o.label);
    }
    case 'rating_scale': {
      const min = question.validationRules?.min ?? 1;
      const max = question.validationRules?.max ?? 5;
      return min + Math.floor(rand() * (max - min + 1));
    }
    case 'number':
      return 1 + Math.floor(rand() * 100);
    case 'date': {
      const start = Date.UTC(2026, 0, 1);
      const day = Math.floor(rand() * 240);
      return new Date(start + day * 86_400_000).toISOString().slice(0, 10);
    }
    case 'short_text':
    case 'long_text':
    default:
      return TEXT_ANSWER_POOL[Math.floor(rand() * TEXT_ANSWER_POOL.length)];
  }
}

/** Questions this respondent skipped (partial submissions leave a tail unanswered). */
function deriveSkippedQuestionIds(
  respondent: Respondent,
  questions: Question[]
): Set<string> {
  const skipped = new Set<string>();
  if (respondent.status !== 'partial' || questions.length === 0) return skipped;
  const r = mulberry32(hashString(`${respondent.id}|ratio`))();
  const completionRatio = 0.55 + r * 0.4; // partial: finished 55–95%
  const answeredCount = Math.max(1, Math.floor(questions.length * completionRatio));
  for (let i = answeredCount; i < questions.length; i++) {
    skipped.add(questions[i].id);
  }
  return skipped;
}

// ============================================================
// Service functions
// ============================================================

export async function getRespondents(
  surveyId: string,
  filters: RespondentsFilters = {}
): Promise<RespondentsResponse> {
  await delay(250);

  const allRespondents = generateRespondents(surveyId);

  let result = [...allRespondents];

  // Search (name or email)
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (filters.status) {
    result = result.filter((r) => r.status === filters.status);
  }

  // Analytics drill-down filter (question + answer label)
  let activeFilter: RespondentsResponse['activeFilter'];
  if (filters.question && filters.answer) {
    const distributions = await getQuestionDistributions(surveyId);
    const dist = distributions.find((d) => d.questionId === filters.question);
    if (dist) {
      const answerMap = buildDistributionAnswerMap(
        allRespondents.map((r) => r.id),
        dist
      );
      const wanted = filters.answer.toLowerCase();
      const matchAnswer = (labels: string[] | undefined) =>
        labels?.some((l) => l.toLowerCase() === wanted) ?? false;
      const matchingIds = new Set(
        [...answerMap.entries()].filter(([, labels]) => matchAnswer(labels)).map(([id]) => id)
      );
      const before = result.length;
      result = result.filter((r) => matchingIds.has(r.id));
      activeFilter = {
        questionId: dist.questionId,
        questionText: dist.questionText,
        answer: filters.answer,
        count: Math.min(before, result.length)
      };
    }
  }

  // Sort (JSON array of { id, desc } — matches nuqs sorting parser)
  if (filters.sort) {
    try {
      const sortItems = JSON.parse(filters.sort) as { id: string; desc: boolean }[];
      if (sortItems.length > 0) {
        const { id, desc } = sortItems[0];
        result.sort((a, b) => {
          const key = id === 'name' ? 'name' : (id as keyof Respondent);
          const aVal = a[key];
          const bVal = b[key];
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            return desc ? bVal - aVal : aVal - bVal;
          }
          const aStr = String(aVal ?? '').toLowerCase();
          const bStr = String(bVal ?? '').toLowerCase();
          return desc ? bStr.localeCompare(aStr) : aStr.localeCompare(bStr);
        });
      }
    } catch {
      // Invalid sort param — ignore
    }
  } else {
    // Default: newest first
    result.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  }

  const total = result.length;
  const page = filters.page ?? 1;
  const limit = filters.limit ?? 10;
  const offset = (page - 1) * limit;
  const respondents = result.slice(offset, offset + limit);

  return {
    surveyId,
    total,
    respondents,
    summary: summarize(allRespondents),
    ...(activeFilter && { activeFilter })
  };
}

export async function getRespondentDetail(
  surveyId: string,
  respondentId: string
): Promise<RespondentDetail | null> {
  await delay(200);

  const respondent = generateRespondents(surveyId).find((r) => r.id === respondentId);
  if (!respondent) return null;

  const survey = await getSurveyById(surveyId);
  if (!survey) return null;

  const distributions = await getQuestionDistributions(surveyId);
  const distByQuestion = new Map(
    distributions.map((d) => [d.questionId, d] as const)
  );

  // Which questions did this (partial) respondent skip entirely?
  const allQuestions = survey.sections.flatMap((s) => s.questions);
  const skippedIds = deriveSkippedQuestionIds(respondent, allQuestions);

  const answers: RespondentAnswer[] = [];

  for (const section of survey.sections) {
    for (const question of section.questions) {
      const analyticsDist = distByQuestion.get(question.id);

      if (analyticsDist) {
        // Ground truth from the analytics distribution (matches drill-down).
        const map = buildDistributionAnswerMap(
          generateRespondents(surveyId).map((r) => r.id),
          analyticsDist
        );
        const labels = map.get(respondent.id);
        answers.push({
          questionId: question.id,
          sectionTitle: section.title,
          promptText: question.promptText,
          helpText: question.helpText,
          questionType: question.type,
          scaleMax:
            question.type === 'rating_scale'
              ? (question.validationRules?.max ?? 5)
              : null,
          answered: (labels?.length ?? 0) > 0,
          value: labels && labels.length > 0
            ? question.type === 'multiple_choice'
              ? labels
              : (labels[0] ?? null)
            : null
        });
        continue;
      }

      // Generic deterministic derivation for questions analytics doesn't cover.
      const skipped = skippedIds.has(question.id);
      answers.push({
        questionId: question.id,
        sectionTitle: section.title,
        promptText: question.promptText,
        helpText: question.helpText,
        questionType: question.type,
        scaleMax:
          question.type === 'rating_scale'
            ? (question.validationRules?.max ?? 5)
            : null,
        answered: !skipped,
        value: skipped ? null : deriveGenericAnswer(question, respondent.id)
      });
    }
  }

  return {
    ...respondent,
    surveyId: surveyId,
    surveyTitle: survey.title,
    surveyStatus: survey.status,
    anonymousCollection: survey.anonymousCollection,
    answers
  };
}
