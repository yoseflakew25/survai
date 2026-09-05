// ============================================================
// Collection Service — Mock Data Layer (Public Endpoints)
// ============================================================

import type { PublicSurvey, Respondent, AnswerPayload } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Mock public survey (matches builder's sur_001) ----

const MOCK_PUBLIC_SURVEY: PublicSurvey = {
  id: 'ver_001',
  surveyVersionId: 'ver_001',
  title: 'Community Health Assessment 2026',
  description:
    'This survey helps us understand the health needs of your community. Your responses are anonymous and will be used to improve healthcare services in the area.',
  sections: [
    {
      id: 'sec_001',
      title: 'Household Demographics',
      description:
        'Help us understand who is participating in this survey. All responses are anonymous.',
      orderIndex: 0,
      questions: [
        {
          id: 'q_001',
          type: 'single_choice',
          promptText: 'What is your age group?',
          helpText: null,
          isRequired: true,
          orderIndex: 0,
          options: [
            { id: 'opt_1', label: '18–24', value: '18-24' },
            { id: 'opt_2', label: '25–34', value: '25-34' },
            { id: 'opt_3', label: '35–44', value: '35-44' },
            { id: 'opt_4', label: '45–54', value: '45-54' },
            { id: 'opt_5', label: '55 or older', value: '55+' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_002',
          type: 'single_choice',
          promptText: 'What is your gender?',
          helpText: null,
          isRequired: true,
          orderIndex: 1,
          options: [
            { id: 'opt_6', label: 'Male', value: 'male' },
            { id: 'opt_7', label: 'Female', value: 'female' },
            { id: 'opt_8', label: 'Other', value: 'other' },
            { id: 'opt_9', label: 'Prefer not to say', value: 'prefer_not_to_say' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_003',
          type: 'dropdown',
          promptText: 'What is the highest level of education you have completed?',
          helpText: null,
          isRequired: true,
          orderIndex: 2,
          options: [
            { id: 'opt_ed1', label: 'No formal education', value: 'none' },
            { id: 'opt_ed2', label: 'Primary school', value: 'primary' },
            { id: 'opt_ed3', label: 'Secondary school', value: 'secondary' },
            { id: 'opt_ed4', label: 'Tertiary education', value: 'tertiary' },
            { id: 'opt_ed5', label: 'Vocational training', value: 'vocational' }
          ],
          validationRules: null,
          conditionalLogic: null
        }
      ]
    },
    {
      id: 'sec_002',
      title: 'Health Status & Conditions',
      description:
        'Tell us about your current health. Be as honest as possible — there are no right or wrong answers.',
      orderIndex: 1,
      questions: [
        {
          id: 'q_004',
          type: 'multiple_choice',
          promptText:
            'Which of the following health conditions have you been diagnosed with?',
          helpText: 'Select all that apply',
          isRequired: true,
          orderIndex: 0,
          options: [
            { id: 'opt_h1', label: 'Hypertension (high blood pressure)', value: 'hypertension' },
            { id: 'opt_h2', label: 'Diabetes', value: 'diabetes' },
            { id: 'opt_h3', label: 'Malaria (in the past 12 months)', value: 'malaria' },
            { id: 'opt_h4', label: 'HIV/AIDS', value: 'hiv_aids' },
            { id: 'opt_h5', label: 'Respiratory illness', value: 'respiratory' },
            { id: 'opt_h6', label: 'None of the above', value: 'none' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_005',
          type: 'rating_scale',
          promptText: 'How would you rate your overall health?',
          helpText: '1 = Poor, 5 = Excellent',
          isRequired: true,
          orderIndex: 1,
          options: null,
          validationRules: { min: 1, max: 5 },
          conditionalLogic: null
        },
        {
          id: 'q_006',
          type: 'long_text',
          promptText:
            'In your own words, describe any health concerns you or your family members currently face.',
          helpText: 'Optional — share as much or as little as you like.',
          isRequired: false,
          orderIndex: 2,
          options: null,
          validationRules: { maxLength: 1000 },
          conditionalLogic: null
        }
      ]
    },
    {
      id: 'sec_003',
      title: 'Healthcare Access',
      description:
        'Help us understand how you access healthcare services in your area.',
      orderIndex: 2,
      questions: [
        {
          id: 'q_007',
          type: 'single_choice',
          promptText: 'How often do you visit a healthcare facility?',
          helpText: null,
          isRequired: true,
          orderIndex: 0,
          options: [
            { id: 'opt_f1', label: 'Weekly', value: 'weekly' },
            { id: 'opt_f2', label: 'Monthly', value: 'monthly' },
            { id: 'opt_f3', label: 'Every few months', value: 'quarterly' },
            { id: 'opt_f4', label: 'Once a year or less', value: 'annually' },
            { id: 'opt_f5', label: 'I do not visit healthcare facilities', value: 'never' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_008',
          type: 'single_choice',
          promptText: 'How far is the healthcare facility you visit most often from your home?',
          helpText: null,
          isRequired: true,
          orderIndex: 1,
          options: [
            { id: 'opt_d1', label: 'Less than 1 km', value: 'lt1' },
            { id: 'opt_d2', label: '1–5 km', value: '1-5' },
            { id: 'opt_d3', label: '5–10 km', value: '5-10' },
            { id: 'opt_d4', label: '10–20 km', value: '10-20' },
            { id: 'opt_d5', label: 'More than 20 km', value: 'gt20' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_009',
          type: 'multiple_choice',
          promptText: 'What are the main barriers you face when trying to access healthcare?',
          helpText: 'Select all that apply',
          isRequired: true,
          orderIndex: 2,
          options: [
            { id: 'opt_b1', label: 'Distance / transportation', value: 'distance' },
            { id: 'opt_b2', label: 'Cost of services', value: 'cost' },
            { id: 'opt_b3', label: 'Long waiting times', value: 'wait' },
            { id: 'opt_b4', label: 'Lack of medicines or supplies', value: 'supplies' },
            { id: 'opt_b5', label: 'Staff attitudes', value: 'staff' },
            { id: 'opt_b6', label: 'I have no barriers', value: 'none' }
          ],
          validationRules: null,
          conditionalLogic: null
        },
        {
          id: 'q_010',
          type: 'number',
          promptText: 'How many people live in your household (including yourself)?',
          helpText: null,
          isRequired: true,
          orderIndex: 3,
          options: null,
          validationRules: { min: 1, max: 30 },
          conditionalLogic: null
        }
      ]
    }
  ]
};

// ---- Mock respondent ----

const MOCK_RESPONDENT: Respondent = {
  id: 'resp_mock_001',
  surveyVersionId: 'ver_001',
  sessionToken: crypto.randomUUID?.() ?? 'mock-token',
  isAnonymous: true,
  startedAt: new Date().toISOString(),
  completedAt: null
};

// ---- Service functions ----

export async function getPublicSurvey(
  versionId: string
): Promise<PublicSurvey | null> {
  await delay(300);
  // In production: GET /public/surveys/{versionId}
  // The Collect page shares the survey id (sur_001) in its public link,
  // so accept both the canonical version id and the demo survey id.
  if (
    versionId === 'ver_001' ||
    versionId === 'test' ||
    versionId === 'sur_001'
  ) {
    return MOCK_PUBLIC_SURVEY;
  }
  return null;
}

export async function startRespondent(
  versionId: string
): Promise<Respondent> {
  await delay(100);
  // In production: POST /public/surveys/{versionId}/respondents
  return {
    ...MOCK_RESPONDENT,
    surveyVersionId: versionId,
    startedAt: new Date().toISOString()
  };
}

export async function submitAnswer(
  respondentId: string,
  answer: AnswerPayload
): Promise<boolean> {
  await delay(50);
  // In production: POST /public/respondents/{id}/answers
  void respondentId;
  void answer;
  return true;
}

export async function completeSurvey(
  respondentId: string
): Promise<boolean> {
  await delay(100);
  // In production: POST /public/respondents/{id}/complete
  void respondentId;
  return true;
}
