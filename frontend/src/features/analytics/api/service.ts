// ============================================================
// Analytics Service — Mock Data Layer
// ============================================================

import type {
  AnalyticsSummary,
  QuestionDistribution,
  CrossTabResult,
  SavedAnalysis
} from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Mock data ----

const MOCK_SUMMARY: AnalyticsSummary = {
  surveyId: 'sur_001',
  surveyVersionId: 'ver_001',
  responseCount: 142,
  completionRate: 78.3,
  avgCompletionMinutes: 11.2,
  metrics: [
    { key: 'total_responses', label: 'Total Responses', value: 142, unit: 'count' },
    { key: 'completion_rate', label: 'Completion Rate', value: 78.3, unit: 'percent' },
    { key: 'avg_time', label: 'Avg. Time', value: 11.2, unit: 'mean' },
    { key: 'median_time', label: 'Median Time', value: 10.0, unit: 'median' }
  ]
};

const MOCK_DISTRIBUTIONS: QuestionDistribution[] = [
  {
    questionId: 'q_001',
    questionText: 'What is your age group?',
    questionType: 'single_choice',
    totalResponses: 140,
    missingCount: 2,
    buckets: [
      { label: '18–24', value: 28, percent: 20.0 },
      { label: '25–34', value: 45, percent: 32.1 },
      { label: '35–44', value: 38, percent: 27.1 },
      { label: '45–54', value: 21, percent: 15.0 },
      { label: '55 or older', value: 8, percent: 5.7 }
    ]
  },
  {
    questionId: 'q_004',
    questionText: 'Health conditions diagnosed',
    questionType: 'multiple_choice',
    totalResponses: 138,
    missingCount: 4,
    buckets: [
      { label: 'Hypertension', value: 52, percent: 37.7 },
      { label: 'Diabetes', value: 31, percent: 22.5 },
      { label: 'Malaria', value: 67, percent: 48.6 },
      { label: 'HIV/AIDS', value: 12, percent: 8.7 },
      { label: 'Respiratory illness', value: 44, percent: 31.9 },
      { label: 'None of the above', value: 23, percent: 16.7 }
    ]
  },
  {
    questionId: 'q_005',
    questionText: 'Overall health rating',
    questionType: 'rating_scale',
    totalResponses: 139,
    missingCount: 3,
    buckets: [
      { label: '1 (Poor)', value: 14, percent: 10.1 },
      { label: '2', value: 22, percent: 15.8 },
      { label: '3', value: 51, percent: 36.7 },
      { label: '4', value: 38, percent: 27.3 },
      { label: '5 (Excellent)', value: 14, percent: 10.1 }
    ]
  },
  {
    questionId: 'q_007',
    questionText: 'How often do you visit a healthcare facility?',
    questionType: 'single_choice',
    totalResponses: 141,
    missingCount: 1,
    buckets: [
      { label: 'Weekly', value: 12, percent: 8.5 },
      { label: 'Monthly', value: 34, percent: 24.1 },
      { label: 'Every few months', value: 48, percent: 34.0 },
      { label: 'Once a year or less', value: 31, percent: 22.0 },
      { label: 'Never', value: 16, percent: 11.3 }
    ]
  },
  {
    questionId: 'q_008',
    questionText: 'Distance to healthcare facility',
    questionType: 'single_choice',
    totalResponses: 141,
    missingCount: 1,
    buckets: [
      { label: 'Less than 1 km', value: 18, percent: 12.8 },
      { label: '1–5 km', value: 42, percent: 29.8 },
      { label: '5–10 km', value: 38, percent: 27.0 },
      { label: '10–20 km', value: 28, percent: 19.9 },
      { label: 'More than 20 km', value: 15, percent: 10.6 }
    ]
  }
];

const MOCK_CROSSTAB: CrossTabResult = {
  questionAId: 'q_001',
  questionAText: 'Age group',
  questionBId: 'q_007',
  questionBText: 'Healthcare visit frequency',
  rowLabels: ['18–24', '25–34', '35–44', '45–54', '55+'],
  colLabels: ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never'],
  cells: [
    { rowLabel: '18–24', colLabel: 'Weekly', count: 2, percent: 7.1 },
    { rowLabel: '18–24', colLabel: 'Monthly', count: 5, percent: 17.9 },
    { rowLabel: '18–24', colLabel: 'Quarterly', count: 10, percent: 35.7 },
    { rowLabel: '18–24', colLabel: 'Annually', count: 8, percent: 28.6 },
    { rowLabel: '18–24', colLabel: 'Never', count: 3, percent: 10.7 },
    { rowLabel: '25–34', colLabel: 'Weekly', count: 3, percent: 6.7 },
    { rowLabel: '25–34', colLabel: 'Monthly', count: 12, percent: 26.7 },
    { rowLabel: '25–34', colLabel: 'Quarterly', count: 16, percent: 35.6 },
    { rowLabel: '25–34', colLabel: 'Annually', count: 10, percent: 22.2 },
    { rowLabel: '25–34', colLabel: 'Never', count: 4, percent: 8.9 },
    { rowLabel: '35–44', colLabel: 'Weekly', count: 4, percent: 10.5 },
    { rowLabel: '35–44', colLabel: 'Monthly', count: 10, percent: 26.3 },
    { rowLabel: '35–44', colLabel: 'Quarterly', count: 13, percent: 34.2 },
    { rowLabel: '35–44', colLabel: 'Annually', count: 8, percent: 21.1 },
    { rowLabel: '35–44', colLabel: 'Never', count: 3, percent: 7.9 },
    { rowLabel: '45–54', colLabel: 'Weekly', count: 2, percent: 9.5 },
    { rowLabel: '45–54', colLabel: 'Monthly', count: 5, percent: 23.8 },
    { rowLabel: '45–54', colLabel: 'Quarterly', count: 7, percent: 33.3 },
    { rowLabel: '45–54', colLabel: 'Annually', count: 4, percent: 19.0 },
    { rowLabel: '45–54', colLabel: 'Never', count: 3, percent: 14.3 },
    { rowLabel: '55+', colLabel: 'Weekly', count: 1, percent: 12.5 },
    { rowLabel: '55+', colLabel: 'Monthly', count: 2, percent: 25.0 },
    { rowLabel: '55+', colLabel: 'Quarterly', count: 2, percent: 25.0 },
    { rowLabel: '55+', colLabel: 'Annually', count: 1, percent: 12.5 },
    { rowLabel: '55+', colLabel: 'Never', count: 2, percent: 25.0 }
  ],
  totalResponses: 138
};

const MOCK_SAVED: SavedAnalysis[] = [
  {
    id: 'sa_001',
    surveyId: 'sur_001',
    surveyVersionId: 'ver_001',
    name: 'Age Distribution Overview',
    filters: [],
    chartConfig: { type: 'bar', questionId: 'q_001' },
    createdAt: '2026-08-29T10:00:00Z'
  },
  {
    id: 'sa_002',
    surveyId: 'sur_001',
    surveyVersionId: 'ver_001',
    name: 'Health Conditions by Age',
    filters: [],
    chartConfig: { type: 'crosstab', questionA: 'q_001', questionB: 'q_004' },
    createdAt: '2026-08-29T11:30:00Z'
  }
];

// ---- Service functions ----

export async function getAnalyticsSummary(
  surveyId: string
): Promise<AnalyticsSummary> {
  await delay(200);
  void surveyId;
  return MOCK_SUMMARY;
}

export async function getQuestionDistributions(
  surveyId: string
): Promise<QuestionDistribution[]> {
  await delay(250);
  void surveyId;
  return MOCK_DISTRIBUTIONS;
}

export async function getCrossTab(
  surveyId: string,
  questionAId: string,
  questionBId: string
): Promise<CrossTabResult> {
  await delay(300);
  void surveyId;
  void questionAId;
  void questionBId;
  return MOCK_CROSSTAB;
}

export async function getSavedAnalyses(
  surveyId: string
): Promise<SavedAnalysis[]> {
  await delay(150);
  void surveyId;
  return MOCK_SAVED;
}
