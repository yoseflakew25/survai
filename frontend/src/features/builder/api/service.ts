// ============================================================
// Builder Service — Mock Data Layer
// ============================================================

import type {
  Survey,
  SurveyListResponse,
  Section,
  Question,
  SurveyDraftOutput,
  QuestionType
} from './types';

// ---- Helpers ----

let idCounter = 1000;
function nextId(prefix: string) {
  return `${prefix}_${++idCounter}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Mock data ----

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'q_001',
    sectionId: 'sec_001',
    surveyId: 'sur_001',
    type: 'single_choice',
    promptText: 'What is your age group?',
    helpText: null,
    isRequired: true,
    orderIndex: 0,
    options: [
      { id: 'opt_1', label: '18-24', value: '18-24' },
      { id: 'opt_2', label: '25-34', value: '25-34' },
      { id: 'opt_3', label: '35-44', value: '35-44' },
      { id: 'opt_4', label: '45-54', value: '45-54' },
      { id: 'opt_5', label: '55+', value: '55+' }
    ],
    validationRules: null,
    conditionalLogic: null,
    source: 'ai_generated',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'q_002',
    sectionId: 'sec_001',
    surveyId: 'sur_001',
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
    conditionalLogic: null,
    source: 'ai_generated',
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'q_003',
    sectionId: 'sec_002',
    surveyId: 'sur_001',
    type: 'multiple_choice',
    promptText: 'Which of the following health conditions have you been diagnosed with? (Select all that apply)',
    helpText: 'Select all that apply',
    isRequired: true,
    orderIndex: 0,
    options: [
      { id: 'opt_10', label: 'Hypertension', value: 'hypertension' },
      { id: 'opt_11', label: 'Diabetes', value: 'diabetes' },
      { id: 'opt_12', label: 'Malaria', value: 'malaria' },
      { id: 'opt_13', label: 'HIV/AIDS', value: 'hiv_aids' },
      { id: 'opt_14', label: 'None of the above', value: 'none' }
    ],
    validationRules: null,
    conditionalLogic: null,
    source: 'ai_generated',
    createdAt: '2026-08-20T10:01:00Z',
    updatedAt: '2026-08-20T10:01:00Z'
  },
  {
    id: 'q_004',
    sectionId: 'sec_002',
    surveyId: 'sur_001',
    type: 'rating_scale',
    promptText: 'How would you rate your overall health?',
    helpText: '1 = Poor, 5 = Excellent',
    isRequired: true,
    orderIndex: 1,
    options: null,
    validationRules: { min: 1, max: 5 },
    conditionalLogic: null,
    source: 'manual',
    createdAt: '2026-08-20T10:02:00Z',
    updatedAt: '2026-08-20T10:02:00Z'
  },
  {
    id: 'q_005',
    sectionId: 'sec_003',
    surveyId: 'sur_001',
    type: 'single_choice',
    promptText: 'How often do you visit a healthcare facility?',
    helpText: null,
    isRequired: true,
    orderIndex: 0,
    options: [
      { id: 'opt_15', label: 'Weekly', value: 'weekly' },
      { id: 'opt_16', label: 'Monthly', value: 'monthly' },
      { id: 'opt_17', label: 'Quarterly', value: 'quarterly' },
      { id: 'opt_18', label: 'Annually', value: 'annually' },
      { id: 'opt_19', label: 'Never', value: 'never' }
    ],
    validationRules: null,
    conditionalLogic: null,
    source: 'ai_generated',
    createdAt: '2026-08-20T10:03:00Z',
    updatedAt: '2026-08-20T10:03:00Z'
  },
  {
    id: 'q_006',
    sectionId: 'sec_003',
    surveyId: 'sur_001',
    type: 'long_text',
    promptText: 'What are the main barriers you face when trying to access healthcare?',
    helpText: 'Please describe any challenges related to distance, cost, availability, or other factors.',
    isRequired: false,
    orderIndex: 1,
    options: null,
    validationRules: { maxLength: 1000 },
    conditionalLogic: null,
    source: 'ai_generated',
    createdAt: '2026-08-20T10:04:00Z',
    updatedAt: '2026-08-20T10:04:00Z'
  }
];

const MOCK_SECTIONS: Section[] = [
  {
    id: 'sec_001',
    surveyId: 'sur_001',
    title: 'Household Demographics',
    description: 'Establish respondent profile and socioeconomic context',
    orderIndex: 0,
    questions: MOCK_QUESTIONS.filter((q) => q.sectionId === 'sec_001'),
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'sec_002',
    surveyId: 'sur_001',
    title: 'Health Status & Conditions',
    description: 'Capture self-reported health conditions and overall health rating',
    orderIndex: 1,
    questions: MOCK_QUESTIONS.filter((q) => q.sectionId === 'sec_002'),
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  },
  {
    id: 'sec_003',
    surveyId: 'sur_001',
    title: 'Healthcare Access & Utilization',
    description: 'Measure frequency and barriers to healthcare services',
    orderIndex: 2,
    questions: MOCK_QUESTIONS.filter((q) => q.sectionId === 'sec_003'),
    createdAt: '2026-08-20T10:00:00Z',
    updatedAt: '2026-08-20T10:00:00Z'
  }
];

const MOCK_SURVEYS: Survey[] = [
  {
    id: 'sur_001',
    planId: 'plan_001',
    organizationId: 'org_001',
    createdBy: 'user_demo_001',
    title: 'Community Health Assessment 2026',
    description: 'Comprehensive health needs assessment for DICDO target communities',
    status: 'draft',
    anonymousCollection: true,
    currentVersionId: null,
    sections: MOCK_SECTIONS,
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-28T14:20:00Z'
  }
];

// ---- Service functions ----

export async function getSurveys(): Promise<SurveyListResponse> {
  await delay(200);
  return { surveys: MOCK_SURVEYS, total: MOCK_SURVEYS.length };
}

export async function getSurveyById(id: string): Promise<Survey | null> {
  await delay(150);
  return MOCK_SURVEYS.find((s) => s.id === id) ?? null;
}

export async function updateSurveyTitle(
  id: string,
  title: string
): Promise<Survey | null> {
  await delay(100);
  const survey = MOCK_SURVEYS.find((s) => s.id === id);
  if (!survey) return null;
  survey.title = title;
  survey.updatedAt = new Date().toISOString();
  return survey;
}

// ---- Section CRUD ----

export async function addSection(
  surveyId: string,
  title: string,
  description?: string
): Promise<Section> {
  await delay(150);
  const survey = MOCK_SURVEYS.find((s) => s.id === surveyId);
  if (!survey) throw new Error('Survey not found');

  const section: Section = {
    id: nextId('sec'),
    surveyId,
    title,
    description: description ?? null,
    orderIndex: survey.sections.length,
    questions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  survey.sections.push(section);
  return section;
}

export async function updateSection(
  sectionId: string,
  data: { title?: string; description?: string }
): Promise<Section | null> {
  await delay(100);
  for (const survey of MOCK_SURVEYS) {
    const section = survey.sections.find((s) => s.id === sectionId);
    if (section) {
      if (data.title !== undefined) section.title = data.title;
      if (data.description !== undefined) section.description = data.description;
      section.updatedAt = new Date().toISOString();
      return section;
    }
  }
  return null;
}

export async function deleteSection(sectionId: string): Promise<boolean> {
  await delay(100);
  for (const survey of MOCK_SURVEYS) {
    const idx = survey.sections.findIndex((s) => s.id === sectionId);
    if (idx !== -1) {
      survey.sections.splice(idx, 1);
      // Reindex
      survey.sections.forEach((s, i) => {
        s.orderIndex = i;
      });
      return true;
    }
  }
  return false;
}

export async function reorderSections(
  surveyId: string,
  sectionIds: string[]
): Promise<void> {
  await delay(100);
  const survey = MOCK_SURVEYS.find((s) => s.id === surveyId);
  if (!survey) return;

  const sectionMap = new Map(survey.sections.map((s) => [s.id, s]));
  survey.sections = sectionIds
    .map((id, i) => {
      const section = sectionMap.get(id);
      if (section) section.orderIndex = i;
      return section;
    })
    .filter(Boolean) as Section[];
}

// ---- Question CRUD ----

export async function addQuestion(
  sectionId: string,
  type: QuestionType,
  promptText: string
): Promise<Question> {
  await delay(150);
  for (const survey of MOCK_SURVEYS) {
    const section = survey.sections.find((s) => s.id === sectionId);
    if (section) {
      const question: Question = {
        id: nextId('q'),
        sectionId,
        surveyId: survey.id,
        type,
        promptText,
        helpText: null,
        isRequired: false,
        orderIndex: section.questions.length,
        options:
          type === 'single_choice' || type === 'multiple_choice' || type === 'dropdown'
            ? [
                { id: nextId('opt'), label: 'Option 1', value: 'option_1' },
                { id: nextId('opt'), label: 'Option 2', value: 'option_2' }
              ]
            : null,
        validationRules: type === 'rating_scale' ? { min: 1, max: 5 } : null,
        conditionalLogic: null,
        source: 'manual',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      section.questions.push(question);
      return question;
    }
  }
  throw new Error('Section not found');
}

export async function updateQuestion(
  questionId: string,
  data: Partial<Pick<Question, 'promptText' | 'helpText' | 'isRequired' | 'type' | 'options' | 'validationRules'>>
): Promise<Question | null> {
  await delay(100);
  for (const survey of MOCK_SURVEYS) {
    for (const section of survey.sections) {
      const question = section.questions.find((q) => q.id === questionId);
      if (question) {
        Object.assign(question, data, { updatedAt: new Date().toISOString() });
        return question;
      }
    }
  }
  return null;
}

export async function deleteQuestion(questionId: string): Promise<boolean> {
  await delay(100);
  for (const survey of MOCK_SURVEYS) {
    for (const section of survey.sections) {
      const idx = section.questions.findIndex((q) => q.id === questionId);
      if (idx !== -1) {
        section.questions.splice(idx, 1);
        section.questions.forEach((q, i) => {
          q.orderIndex = i;
        });
        return true;
      }
    }
  }
  return false;
}

export async function reorderQuestions(
  sectionId: string,
  questionIds: string[]
): Promise<void> {
  await delay(100);
  for (const survey of MOCK_SURVEYS) {
    const section = survey.sections.find((s) => s.id === sectionId);
    if (section) {
      const questionMap = new Map(section.questions.map((q) => [q.id, q]));
      section.questions = questionIds
        .map((id, i) => {
          const q = questionMap.get(id);
          if (q) q.orderIndex = i;
          return q;
        })
        .filter(Boolean) as Question[];
      return;
    }
  }
}

// ---- AI Generation ----

export async function generateSurveyDraft(
  surveyId: string
): Promise<SurveyDraftOutput> {
  await delay(3500);

  return {
    sections: [
      {
        title: 'Household Demographics',
        questions: [
          {
            promptText: 'What is your age group?',
            type: 'single_choice' as QuestionType,
            options: ['18-24', '25-34', '35-44', '45-54', '55+'],
            isRequired: true,
            helpText: null
          },
          {
            promptText: 'What is your gender?',
            type: 'single_choice' as QuestionType,
            options: ['Male', 'Female', 'Other', 'Prefer not to say'],
            isRequired: true,
            helpText: null
          },
          {
            promptText: 'What is the highest level of education completed?',
            type: 'single_choice' as QuestionType,
            options: [
              'No formal education',
              'Primary school',
              'Secondary school',
              'Tertiary education',
              'Vocational training'
            ],
            isRequired: true,
            helpText: null
          }
        ]
      },
      {
        title: 'Health Status & Conditions',
        questions: [
          {
            promptText:
              'Which of the following health conditions have you been diagnosed with?',
            type: 'multiple_choice' as QuestionType,
            options: [
              'Hypertension',
              'Diabetes',
              'Malaria',
              'HIV/AIDS',
              'Respiratory illness',
              'None of the above'
            ],
            isRequired: true,
            helpText: 'Select all that apply'
          },
          {
            promptText: 'How would you rate your overall health?',
            type: 'rating_scale' as QuestionType,
            options: null,
            isRequired: true,
            helpText: '1 = Poor, 5 = Excellent'
          },
          {
            promptText:
              'In the past 3 months, have you experienced any of the following symptoms?',
            type: 'multiple_choice' as QuestionType,
            options: [
              'Fever',
              'Headache',
              'Diarrhea',
              'Cough',
              'Fatigue',
              'None of the above'
            ],
            isRequired: true,
            helpText: null
          }
        ]
      },
      {
        title: 'Healthcare Access & Utilization',
        questions: [
          {
            promptText: 'How often do you visit a healthcare facility?',
            type: 'single_choice' as QuestionType,
            options: ['Weekly', 'Monthly', 'Quarterly', 'Annually', 'Never'],
            isRequired: true,
            helpText: null
          },
          {
            promptText:
              'What is the primary healthcare facility you visit?',
            type: 'short_text' as QuestionType,
            options: null,
            isRequired: true,
            helpText: 'Name or describe the facility'
          },
          {
            promptText:
              'How far is the healthcare facility from your home?',
            type: 'single_choice' as QuestionType,
            options: [
              'Less than 1 km',
              '1-5 km',
              '5-10 km',
              '10-20 km',
              'More than 20 km'
            ],
            isRequired: true,
            helpText: null
          },
          {
            promptText:
              'What are the main barriers you face when trying to access healthcare?',
            type: 'long_text' as QuestionType,
            options: null,
            isRequired: false,
            helpText:
              'Please describe any challenges related to distance, cost, availability, or other factors.'
          }
        ]
      }
    ]
  };
}
