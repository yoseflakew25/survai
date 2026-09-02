// ============================================================
// Plans Service — Mock Data Layer
// ============================================================
// Replace function bodies with real API calls when backend is ready.
// Components never import from here directly — go through queries.ts.
// ============================================================

import type {
  Plan,
  PlanListResponse,
  PlanCreatePayload,
  PlanUpdatePayload,
  SurveyPlanOutput
} from './types';

// ---- Mock store ----

const MOCK_PLANS: Plan[] = [
  {
    id: 'plan_001',
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal:
      'Assess the health status, healthcare access, and community health needs of residents in the DICDO target communities to inform program design and resource allocation.',
    objectives: [
      'Understand the primary health concerns and disease burden in target communities',
      'Evaluate current healthcare access and utilization patterns',
      'Identify barriers to healthcare access for vulnerable populations',
      'Assess community awareness of preventive health practices'
    ],
    researchQuestions: [
      'What are the most prevalent health conditions reported by households?',
      'How frequently do community members access formal healthcare services?',
      'What are the main barriers to accessing healthcare in the target area?',
      'What is the level of awareness about common preventive health measures?'
    ],
    targetRespondents: [
      'Household heads or primary caregivers aged 18-65',
      'Community health workers',
      'Local healthcare facility staff'
    ],
    proposedSections: [
      {
        title: 'Household Demographics',
        rationale: 'Establish respondent profile and socioeconomic context for analysis'
      },
      {
        title: 'Health Status & Conditions',
        rationale: 'Capture self-reported health conditions, chronic illnesses, and recent health events'
      },
      {
        title: 'Healthcare Access & Utilization',
        rationale: 'Measure frequency, distance, cost, and satisfaction with healthcare services'
      },
      {
        title: 'Barriers to Healthcare',
        rationale: 'Identify structural, financial, and awareness-related barriers'
      },
      {
        title: 'Preventive Health Practices',
        rationale: 'Assess knowledge and adoption of preventive measures such as vaccination, hygiene, and nutrition'
      }
    ],
    estimatedLengthMinutes: 25,
    status: 'approved',
    aiGenerationMeta: {
      model: 'gpt-4o',
      promptVersion: 'planner_v1',
      requestId: 'req_mock_001',
      latencyMs: 3200
    },
    createdAt: '2026-08-15T10:30:00Z',
    updatedAt: '2026-08-28T14:20:00Z'
  },
  {
    id: 'plan_002',
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal:
      'Evaluate the effectiveness of the DICDO education support program on student performance and school retention in target communities.',
    objectives: [
      'Measure changes in student academic performance since program inception',
      'Assess school attendance and retention rates among program beneficiaries',
      'Understand community perceptions of the education program',
      'Identify factors that contribute to or hinder student success'
    ],
    researchQuestions: [
      'How has student performance changed since the education program began?',
      'What is the attendance and retention rate among program beneficiaries?',
      'How do parents and teachers perceive the program impact?',
      'What external factors most affect student success in the program?'
    ],
    targetRespondents: [
      'Students aged 10-18 enrolled in supported schools',
      'Parents/guardians of enrolled students',
      'Teachers and school administrators'
    ],
    proposedSections: [
      {
        title: 'Student Background',
        rationale: 'Capture demographic and socioeconomic context of students'
      },
      {
        title: 'Academic Performance',
        rationale: 'Collect data on grades, test scores, and academic progress'
      },
      {
        title: 'Attendance & Retention',
        rationale: 'Measure attendance patterns and dropout rates'
      },
      {
        title: 'Program Perception',
        rationale: 'Gather stakeholder views on program effectiveness and areas for improvement'
      }
    ],
    estimatedLengthMinutes: 20,
    status: 'draft',
    aiGenerationMeta: null,
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-30T11:45:00Z'
  },
  {
    id: 'plan_003',
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal:
      'Establish a baseline assessment of water and sanitation conditions in DICDO target communities to guide infrastructure investments and behavior change programs.',
    objectives: [
      'Map current water sources and sanitation facilities across target communities',
      'Assess water quality and availability across seasons',
      'Evaluate household water treatment and storage practices',
      'Identify the most critical water and sanitation infrastructure gaps'
    ],
    researchQuestions: [
      'What are the primary water sources used by households in the target area?',
      'How does water availability vary across dry and wet seasons?',
      'What household water treatment methods are currently practiced?',
      'Which sanitation infrastructure gaps pose the greatest health risk?'
    ],
    targetRespondents: [
      'Household representatives responsible for water collection',
      'Community leaders and water committee members',
      'Local government officials responsible for WASH'
    ],
    proposedSections: [
      {
        title: 'Household Profile',
        rationale: 'Understand household composition and living conditions'
      },
      {
        title: 'Water Sources & Access',
        rationale: 'Map primary and secondary water sources, distance, and time to collect'
      },
      {
        title: 'Water Quality & Treatment',
        rationale: 'Assess perceived and tested water quality, treatment practices'
      },
      {
        title: 'Sanitation Facilities',
        rationale: 'Document latrine types, hygiene practices, and waste management'
      },
      {
        title: 'Seasonal Variations',
        rationale: 'Capture how water access and quality change across seasons'
      },
      {
        title: 'Infrastructure Needs',
        rationale: 'Priority ranking of community-identified infrastructure gaps'
      }
    ],
    estimatedLengthMinutes: 30,
    status: 'draft',
    aiGenerationMeta: null,
    createdAt: '2026-08-28T16:00:00Z',
    updatedAt: '2026-08-28T16:00:00Z'
  }
];

// ---- Simulated AI generation delay ----

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Service functions ----

export async function getPlans(): Promise<PlanListResponse> {
  await delay(200);
  return { plans: MOCK_PLANS, total: MOCK_PLANS.length };
}

export async function getPlanById(id: string): Promise<Plan | null> {
  await delay(150);
  const existing = MOCK_PLANS.find((p) => p.id === id);
  if (existing) return existing;

  // For dynamically created plan IDs, create a new mock plan on the fly
  const newPlan: Plan = {
    id,
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal: 'New survey plan — edit this research goal to get started.',
    objectives: [],
    researchQuestions: [],
    targetRespondents: [],
    proposedSections: [],
    estimatedLengthMinutes: null,
    status: 'draft',
    aiGenerationMeta: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  MOCK_PLANS.unshift(newPlan);
  return newPlan;
}

export async function createPlan(data: PlanCreatePayload): Promise<Plan> {
  await delay(300);
  const newPlan: Plan = {
    id: `plan_${Date.now()}`,
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal: data.researchGoal,
    objectives: [],
    researchQuestions: [],
    targetRespondents: [],
    proposedSections: [],
    estimatedLengthMinutes: null,
    status: 'draft',
    aiGenerationMeta: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  MOCK_PLANS.unshift(newPlan);
  return newPlan;
}

/**
 * Simulate AI generation — creates a plan and then populates it with AI-generated content.
 * Returns a progress callback so the UI can show step-by-step generation.
 */
export async function createPlanWithAI(
  data: PlanCreatePayload,
  onProgress?: (step: string, progress: number) => void
): Promise<Plan> {
  // Step 1: Create the plan shell
  onProgress?.('Creating plan...', 10);
  await delay(400);
  const newPlan: Plan = {
    id: `plan_${Date.now()}`,
    createdBy: 'user_demo_001',
    organizationId: 'org_001',
    researchGoal: data.researchGoal,
    objectives: [],
    researchQuestions: [],
    targetRespondents: [],
    proposedSections: [],
    estimatedLengthMinutes: null,
    status: 'draft',
    aiGenerationMeta: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  MOCK_PLANS.unshift(newPlan);

  // Step 2: Analyze research goal
  onProgress?.('Analyzing research goal...', 25);
  await delay(800);

  // Step 3: Generating objectives
  onProgress?.('Generating objectives...', 40);
  await delay(700);
  newPlan.objectives = [
    'Understand the primary concerns and needs of the target population',
    'Evaluate current service delivery and utilization patterns',
    'Identify barriers and gaps in program implementation',
    'Assess awareness and adoption of key practices'
  ];

  // Step 4: Generating research questions
  onProgress?.('Generating research questions...', 55);
  await delay(600);
  newPlan.researchQuestions = [
    'What are the most frequently reported needs in the target community?',
    'How do community members currently access available services?',
    'What factors limit participation in existing programs?',
    'What is the awareness level of available resources and services?'
  ];

  // Step 5: Generating target respondents
  onProgress?.('Identifying target respondents...', 70);
  await delay(500);
  newPlan.targetRespondents = [
    'Community members aged 18-65 in target areas',
    'Local leaders and organizational representatives',
    'Service providers and frontline workers'
  ];

  // Step 6: Generating sections
  onProgress?.('Designing survey sections...', 85);
  await delay(600);
  newPlan.proposedSections = [
    {
      title: 'Respondent Profile',
      rationale: 'Establish demographic and socioeconomic baseline for segmentation'
    },
    {
      title: 'Current Situation Assessment',
      rationale: 'Capture the present state of the issue being surveyed'
    },
    {
      title: 'Service Access & Utilization',
      rationale: 'Measure how respondents interact with available services'
    },
    {
      title: 'Barriers & Challenges',
      rationale: 'Identify structural, financial, and informational barriers'
    },
    {
      title: 'Recommendations & Priorities',
      rationale: 'Capture respondent priorities and suggested improvements'
    }
  ];

  // Step 7: Finalizing
  onProgress?.('Finalizing plan...', 95);
  await delay(400);
  newPlan.estimatedLengthMinutes = 22;
  newPlan.aiGenerationMeta = {
    model: 'gpt-4o',
    promptVersion: 'planner_v1',
    requestId: `req_${Date.now()}`,
    latencyMs: 4000
  };
  newPlan.updatedAt = new Date().toISOString();

  onProgress?.('Plan generated!', 100);
  await delay(200);

  return newPlan;
}

export async function updatePlan(
  id: string,
  data: PlanUpdatePayload
): Promise<Plan | null> {
  await delay(200);
  const plan = MOCK_PLANS.find((p) => p.id === id);
  if (!plan) return null;

  Object.assign(plan, data, { updatedAt: new Date().toISOString() });
  return plan;
}

export async function generatePlanWithAI(
  planId: string
): Promise<SurveyPlanOutput> {
  // Simulate AI generation — in production this hits POST /plans/{id}/generate
  await delay(3000);

  const plan = MOCK_PLANS.find((p) => p.id === planId);
  if (!plan) throw new Error('Plan not found');

  // Return mock AI output — the service layer would merge this into the plan
  return {
    objectives: [
      'Understand the primary concerns and needs of the target population',
      'Evaluate current service delivery and utilization patterns',
      'Identify barriers and gaps in program implementation',
      'Assess awareness and adoption of key practices'
    ],
    researchQuestions: [
      'What are the most frequently reported needs in the target community?',
      'How do community members currently access available services?',
      'What factors limit participation in existing programs?',
      'What is the awareness level of available resources and services?'
    ],
    targetRespondents: [
      'Community members aged 18-65 in target areas',
      'Local leaders and organizational representatives',
      'Service providers and frontline workers'
    ],
    proposedSections: [
      {
        title: 'Respondent Profile',
        rationale: 'Establish demographic and socioeconomic baseline for segmentation'
      },
      {
        title: 'Current Situation Assessment',
        rationale: 'Capture the present state of the issue being surveyed'
      },
      {
        title: 'Service Access & Utilization',
        rationale: 'Measure how respondents interact with available services'
      },
      {
        title: 'Barriers & Challenges',
        rationale: 'Identify structural, financial, and informational barriers'
      },
      {
        title: 'Recommendations & Priorities',
        rationale: 'Capture respondent priorities and suggested improvements'
      }
    ],
    estimatedLengthMinutes: 22,
    notes:
      'Generated from research goal. Review objectives and sections for alignment with your specific context before proceeding to the builder.'
  };
}

export async function approvePlan(id: string): Promise<Plan | null> {
  await delay(200);
  const plan = MOCK_PLANS.find((p) => p.id === id);
  if (!plan) return null;
  plan.status = 'approved';
  plan.updatedAt = new Date().toISOString();
  return plan;
}
