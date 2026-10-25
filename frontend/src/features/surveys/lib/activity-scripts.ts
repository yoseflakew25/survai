/** UX-paced activity scripts for the survey workspace loading modal. */

export type ActivityStage = {
  id: string;
  label: string;
  detail: string;
  progress: number;
  afterMs: number;
};

export type SurveyActivityId =
  | 'fetch-plan'
  | 'fetch-review'
  | 'fetch-collect'
  | 'fetch-respondents'
  | 'fetch-analytics'
  | 'fetch-report'
  | 'generate-report'
  | 'regenerate-report'
  | 'regenerate-section'
  | 'run-review'
  | 'regenerate-survey'
  | 'publish-survey'
  | 'generate-plan'
  | 'generate-survey';

export type SurveyActivityScript = {
  title: string;
  intro: string;
  footer?: string;
  previewLabel?: string;
  stages: ActivityStage[];
};

const FETCH_STAGES = (
  nouns: [string, string, string, string]
): ActivityStage[] => [
  {
    id: 'connect',
    label: nouns[0],
    detail: 'Opening a secure session with your workspace…',
    progress: 12,
    afterMs: 0
  },
  {
    id: 'load',
    label: nouns[1],
    detail: 'Pulling the latest saved snapshot for this survey…',
    progress: 38,
    afterMs: 450
  },
  {
    id: 'assemble',
    label: nouns[2],
    detail: 'Preparing charts, lists, and panel chrome…',
    progress: 68,
    afterMs: 1100
  },
  {
    id: 'ready',
    label: nouns[3],
    detail: 'Almost ready — finishing layout…',
    progress: 88,
    afterMs: 1800
  }
];

export const PLAN_GENERATION_STAGES: ActivityStage[] = [
  {
    id: 'analyze',
    label: 'Reading your research goal',
    detail: 'Parsing intent, scope, and who this survey is for…',
    progress: 8,
    afterMs: 0
  },
  {
    id: 'objectives',
    label: 'Drafting research objectives',
    detail: 'Turning the goal into clear, measurable outcomes…',
    progress: 22,
    afterMs: 1800
  },
  {
    id: 'questions',
    label: 'Shaping research questions',
    detail: 'Deciding what the survey must be able to answer…',
    progress: 40,
    afterMs: 4200
  },
  {
    id: 'respondents',
    label: 'Identifying target respondents',
    detail: 'Choosing who should take the survey and why…',
    progress: 58,
    afterMs: 7000
  },
  {
    id: 'sections',
    label: 'Designing survey sections',
    detail: 'Building a logical flow of topics and rationale…',
    progress: 76,
    afterMs: 10000
  },
  {
    id: 'finalize',
    label: 'Polishing the plan',
    detail: 'Estimating length and checking consistency…',
    progress: 90,
    afterMs: 13500
  }
];

export const SURVEY_GENERATION_STAGES: ActivityStage[] = [
  {
    id: 'plan',
    label: 'Reading your research plan',
    detail: 'Loading objectives, audiences, and proposed sections…',
    progress: 8,
    afterMs: 0
  },
  {
    id: 'structure',
    label: 'Structuring the questionnaire',
    detail: 'Turning proposed sections into a clear survey flow…',
    progress: 22,
    afterMs: 2000
  },
  {
    id: 'demographics',
    label: 'Drafting opening questions',
    detail: 'Writing demographics and screening items…',
    progress: 40,
    afterMs: 4500
  },
  {
    id: 'core',
    label: 'Writing core questions',
    detail: 'Aligning question types with your research objectives…',
    progress: 58,
    afterMs: 7500
  },
  {
    id: 'choices',
    label: 'Building answer options',
    detail: 'Adding choices, scales, and help text where needed…',
    progress: 76,
    afterMs: 10500
  },
  {
    id: 'finalize',
    label: 'Polishing the draft',
    detail: 'Checking wording, required fields, and section order…',
    progress: 90,
    afterMs: 14000
  }
];

export const SURVEY_ACTIVITY_SCRIPTS: Record<
  SurveyActivityId,
  SurveyActivityScript
> = {
  'fetch-plan': {
    title: 'Loading research plan',
    intro: 'Fetching the linked plan and survey metadata for this workspace.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading plan details',
      'Assembling plan panels',
      'Opening Plan'
    ])
  },
  'fetch-review': {
    title: 'Loading review workspace',
    intro: 'Fetching questions, findings, and review status for this survey.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading questionnaire',
      'Loading review findings',
      'Opening Review'
    ])
  },
  'fetch-collect': {
    title: 'Loading collection',
    intro: 'Fetching publish status, collection link, and response stats.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading collect settings',
      'Preparing link & QR',
      'Opening Collect'
    ])
  },
  'fetch-respondents': {
    title: 'Loading respondents',
    intro: 'Fetching respondent rows for the live survey version.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading respondent list',
      'Building the table',
      'Opening Respondents'
    ])
  },
  'fetch-analytics': {
    title: 'Loading analytics',
    intro: 'Fetching summary metrics, distributions, and cross-tabs.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading response metrics',
      'Building charts',
      'Opening Analytics'
    ])
  },
  'fetch-report': {
    title: 'Loading report',
    intro: 'Fetching the latest grounded report and chat history.',
    stages: FETCH_STAGES([
      'Connecting to SurvAI',
      'Loading report snapshot',
      'Preparing sections',
      'Opening Report'
    ])
  },
  'generate-report': {
    title: 'Generating report',
    intro:
      'SurvAI is writing a grounded long-form report from your live analytics. This usually takes about a minute.',
    footer: 'Keep this open. You can edit every section after generation.',
    stages: [
      {
        id: 'metrics',
        label: 'Freezing analytics snapshot',
        detail: 'Locking response counts and distributions for grounding…',
        progress: 10,
        afterMs: 0
      },
      {
        id: 'outline',
        label: 'Outlining the report',
        detail: 'Choosing sections that match your findings…',
        progress: 28,
        afterMs: 4000
      },
      {
        id: 'findings',
        label: 'Writing key findings',
        detail: 'Drafting evidence-backed statements with metric refs…',
        progress: 52,
        afterMs: 12000
      },
      {
        id: 'detail',
        label: 'Expanding analysis',
        detail: 'Filling detailed analysis and recommendations…',
        progress: 74,
        afterMs: 28000
      },
      {
        id: 'reconcile',
        label: 'Checking number grounding',
        detail: 'Reconciling claims against the frozen metrics…',
        progress: 90,
        afterMs: 45000
      }
    ]
  },
  'regenerate-report': {
    title: 'Regenerating report',
    intro:
      'SurvAI is rewriting the full report from the analytics data.',
    footer: 'Keep this open. Prior edits on sections will be replaced.',
    stages: [
      {
        id: 'metrics',
        label: 'Refreshing metrics snapshot',
        detail: 'Pulling the latest completed responses…',
        progress: 10,
        afterMs: 0
      },
      {
        id: 'rewrite',
        label: 'Rewriting every section',
        detail: 'Generating a fresh long-form narrative…',
        progress: 40,
        afterMs: 5000
      },
      {
        id: 'ground',
        label: 'Re-grounding claims',
        detail: 'Checking numbers against live analytics…',
        progress: 72,
        afterMs: 20000
      },
      {
        id: 'finalize',
        label: 'Finalizing the draft',
        detail: 'Saving the new report version…',
        progress: 90,
        afterMs: 40000
      }
    ]
  },
  'regenerate-section': {
    title: 'Regenerating section',
    intro: 'Rewriting this section with fresh grounded language.',
    footer: 'Other sections stay as they are.',
    stages: [
      {
        id: 'context',
        label: 'Gathering section context',
        detail: 'Loading neighboring sections and metric refs…',
        progress: 15,
        afterMs: 0
      },
      {
        id: 'draft',
        label: 'Drafting replacement copy',
        detail: 'Writing a new grounded paragraph set…',
        progress: 55,
        afterMs: 2500
      },
      {
        id: 'check',
        label: 'Checking grounding',
        detail: 'Verifying numbers against the report snapshot…',
        progress: 88,
        afterMs: 8000
      }
    ]
  },
  'run-review': {
    title: 'Reviewing with AI',
    intro:
      'Checking wording, ambiguity, and alignment with your research plan…',
    footer: 'Findings appear in the review panel when this finishes.',
    stages: [
      {
        id: 'bias',
        label: 'Leading wording & bias',
        detail: 'Scanning for loaded or leading phrasing…',
        progress: 18,
        afterMs: 0
      },
      {
        id: 'ambiguity',
        label: 'Double-barreled & ambiguous questions',
        detail: 'Flagging items that ask two things at once…',
        progress: 42,
        afterMs: 3500
      },
      {
        id: 'alignment',
        label: 'Plan alignment',
        detail: 'Comparing questions to research objectives…',
        progress: 68,
        afterMs: 8000
      },
      {
        id: 'finalize',
        label: 'Ranking findings',
        detail: 'Sorting issues by severity for the review board…',
        progress: 90,
        afterMs: 13000
      }
    ]
  },
  'regenerate-survey': {
    title: 'Generating survey questions',
    intro:
      'SurvAI is drafting survey sections and questions from your plan. This usually takes 15–30 seconds.',
    footer: 'Keep this open. You can edit every question after generation.',
    previewLabel: 'Research goal',
    stages: SURVEY_GENERATION_STAGES
  },
  'publish-survey': {
    title: 'Publishing survey',
    intro: 'Freezing the live questionnaire version and unlocking collection.',
    footer: 'Once published, question text stays locked for this version.',
    stages: [
      {
        id: 'validate',
        label: 'Validating the draft',
        detail: 'Checking sections, required fields, and structure…',
        progress: 20,
        afterMs: 0
      },
      {
        id: 'snapshot',
        label: 'Creating version snapshot',
        detail: 'Freezing questions for respondents…',
        progress: 55,
        afterMs: 800
      },
      {
        id: 'link',
        label: 'Activating collection link',
        detail: 'Turning on the public response URL…',
        progress: 85,
        afterMs: 1800
      }
    ]
  },
  'generate-plan': {
    title: 'Generating Survey plan',
    intro:
      'SurvAI is drafting objectives, research questions, audiences, and sections from your goal. This usually takes 10–20 seconds.',
    footer: 'Keep this open. You can edit every field after generation.',
    previewLabel: 'Research goal',
    stages: PLAN_GENERATION_STAGES
  },
  'generate-survey': {
    title: 'Generating survey questions',
    intro:
      'SurvAI is drafting survey sections and questions from your plan. This usually takes 15–30 seconds.',
    footer: 'Keep this open. You can edit every question after generation.',
    previewLabel: 'Research goal',
    stages: SURVEY_GENERATION_STAGES
  }
};

export function getActivityScript(
  id: SurveyActivityId
): SurveyActivityScript {
  return SURVEY_ACTIVITY_SCRIPTS[id];
}
