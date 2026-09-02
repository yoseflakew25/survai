// ============================================================
// Reviewer Service — Mock Data Layer
// ============================================================

import type {
  ReviewerReport,
  ReviewerFinding,
  FindingStatus,
  ScoreCriterion
} from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Mock report ----

const MOCK_SCORE_CRITERIA: ScoreCriterion[] = [
  {
    label: 'Clarity',
    score: 4.0,
    description: 'Questions are clearly worded and easy to understand'
  },
  {
    label: 'Objectivity',
    score: 3.5,
    description: 'Questions avoid leading or biased phrasing'
  },
  {
    label: 'Completeness',
    score: 4.5,
    description: 'All objectives are covered by the question set'
  },
  {
    label: 'Conciseness',
    score: 4.0,
    description: 'Survey length is appropriate for the target audience'
  },
  {
    label: 'Logical Flow',
    score: 3.0,
    description: 'Questions follow a logical progression'
  }
];

const MOCK_FINDINGS: ReviewerFinding[] = [
  {
    id: 'find_001',
    reviewerReportId: 'rev_001',
    questionId: 'q_004',
    questionText:
      'Which of the following health conditions have you been diagnosed with?',
    sectionTitle: 'Health Status & Conditions',
    issueType: 'double_barreled',
    explanation:
      'This question combines multiple conditions into one selection. A respondent with both hypertension and diabetes must select both, but the analysis cannot distinguish which conditions are more prevalent individually.',
    suggestedRewrite:
      'Consider splitting into two questions: one for chronic conditions (hypertension, diabetes) and one for infectious diseases (malaria, HIV/AIDS).',
    status: 'open',
    createdAt: '2026-08-28T14:30:00Z'
  },
  {
    id: 'find_002',
    reviewerReportId: 'rev_001',
    questionId: 'q_006',
    questionText:
      'In your own words, describe any health concerns you or your family members currently face.',
    sectionTitle: 'Health Status & Conditions',
    issueType: 'ambiguous',
    explanation:
      'The phrase "health concerns" is vague — it could mean diagnosed conditions, symptoms, worries, or access issues. The open-ended format also makes quantitative analysis difficult.',
    suggestedRewrite:
      'Narrow the scope: "Describe any symptoms you have experienced in the past 3 months." This gives respondents a clear time frame and focus.',
    status: 'open',
    createdAt: '2026-08-28T14:30:00Z'
  },
  {
    id: 'find_003',
    reviewerReportId: 'rev_001',
    questionId: 'q_009',
    questionText:
      'What are the main barriers you face when trying to access healthcare?',
    sectionTitle: 'Healthcare Access',
    issueType: 'leading_wording',
    explanation:
      'The phrase "barriers you face" assumes the respondent experiences barriers. Some respondents may have no barriers but feel pressured to select one.',
    suggestedRewrite:
      'Use neutral phrasing: "Do you experience any challenges accessing healthcare? If yes, which of the following apply?"',
    status: 'open',
    createdAt: '2026-08-28T14:30:00Z'
  },
  {
    id: 'find_004',
    reviewerReportId: 'rev_001',
    questionId: 'q_003',
    questionText:
      'What is the highest level of education you have completed?',
    sectionTitle: 'Household Demographics',
    issueType: 'objective_misalignment',
    explanation:
      'Education level is not directly listed as a research objective. Unless it will be used as a stratification variable for analysis, it may add length without contributing to the stated goals.',
    suggestedRewrite:
      'If education is needed for segmentation, keep it. Otherwise, consider removing to reduce survey length.',
    status: 'dismissed',
    createdAt: '2026-08-28T14:30:00Z'
  }
];

const MOCK_REPORT: ReviewerReport = {
  id: 'rev_001',
  surveyId: 'sur_001',
  overallQualityScore: 3.8,
  estimatedCompletionMinutes: 12,
  requiredQuestionCount: 8,
  scoreCriteria: MOCK_SCORE_CRITERIA,
  findings: MOCK_FINDINGS,
  aiGenerationMeta: {
    model: 'gpt-4o',
    promptVersion: 'reviewer_v1',
    latencyMs: 2800
  },
  createdAt: '2026-08-28T14:30:00Z'
};

// ---- Service functions ----

export async function getLatestReview(
  surveyId: string
): Promise<ReviewerReport | null> {
  await delay(200);
  // Return mock data for any survey ID
  return {
    ...MOCK_REPORT,
    id: `rev_${surveyId}`,
    surveyId,
    createdAt: new Date().toISOString()
  };
}

export async function triggerReview(
  surveyId: string
): Promise<ReviewerReport> {
  // Simulate AI review — in production this hits POST /surveys/{id}/review
  await delay(4000);
  void surveyId;
  return {
    ...MOCK_REPORT,
    id: `rev_${Date.now()}`,
    createdAt: new Date().toISOString()
  };
}

export async function updateFindingStatus(
  findingId: string,
  status: FindingStatus
): Promise<ReviewerFinding | null> {
  await delay(100);
  const finding = MOCK_FINDINGS.find((f) => f.id === findingId);
  if (finding) {
    finding.status = status;
    return finding;
  }
  return null;
}
