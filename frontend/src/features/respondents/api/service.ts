// ============================================================
// Respondents Service — Mock Data Layer
// Mirrors the responseCount in surveys mock data per survey id
// ============================================================

import type {
  Respondent,
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

// ---- Service functions ----

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
    summary: summarize(allRespondents)
  };
}
