export const ADMIN_FEATURE_FLAG_KEYS = [
  'ai_planner',
  'ai_builder',
  'ai_reviewer',
  'ai_report',
  'ai_assistant',
  'publish_survey',
  'collect_responses',
  'exports'
] as const;

export const ADMIN_FEATURE_FLAG_LABELS: Record<string, string> = {
  ai_planner: 'AI research planner',
  ai_builder: 'AI survey builder',
  ai_reviewer: 'AI reviewer',
  ai_report: 'AI reports',
  ai_assistant: 'Org assistant',
  publish_survey: 'Publish surveys',
  collect_responses: 'Collect responses',
  exports: 'Exports'
};

export const ADMIN_FEATURE_FLAG_GROUPS = [
  {
    title: 'AI surfaces',
    keys: [
      'ai_planner',
      'ai_builder',
      'ai_reviewer',
      'ai_report',
      'ai_assistant'
    ] as const
  },
  {
    title: 'Survey operations',
    keys: ['publish_survey', 'collect_responses', 'exports'] as const
  }
] as const;
