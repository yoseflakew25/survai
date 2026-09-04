// ============================================================
// Collect Service — Mock Data Layer
// ============================================================

import type { CollectStats } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock response counts keyed by survey id (mirrors surveys mock data)
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

// ---- Service functions ----

export async function getCollectStats(surveyId: string): Promise<CollectStats> {
  await delay(200);
  return {
    surveyId,
    responseCount: MOCK_RESPONSE_COUNTS[surveyId] ?? 0
  };
}