import type { SurveyListItem, SurveyListResponse, SurveyListFilters } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MOCK_SURVEYS: SurveyListItem[] = [
  {
    id: 'sur_001',
    title: 'Community Health Assessment 2026',
    description: 'Comprehensive health needs assessment for DICDO target communities',
    status: 'published',
    sectionsCount: 5,
    questionsCount: 24,
    responsesCount: 142,
    completionRate: 78.3,
    lastResponseAt: '2026-09-01T08:30:00Z',
    createdAt: '2026-08-15T10:00:00Z',
    updatedAt: '2026-08-28T14:20:00Z'
  },
  {
    id: 'sur_002',
    title: 'Education Program Evaluation',
    description: 'Evaluate the effectiveness of the DICDO education support program',
    status: 'draft',
    sectionsCount: 4,
    questionsCount: 18,
    responsesCount: 0,
    completionRate: null,
    lastResponseAt: null,
    createdAt: '2026-08-20T09:00:00Z',
    updatedAt: '2026-08-30T11:45:00Z'
  },
  {
    id: 'sur_003',
    title: 'Water & Sanitation Baseline',
    description: 'Baseline assessment of water and sanitation conditions in target communities',
    status: 'closed',
    sectionsCount: 6,
    questionsCount: 32,
    responsesCount: 89,
    completionRate: 82.1,
    lastResponseAt: '2026-08-10T16:00:00Z',
    createdAt: '2026-07-28T10:00:00Z',
    updatedAt: '2026-08-10T16:00:00Z'
  },
  {
    id: 'sur_004',
    title: 'Livelihoods Impact Survey',
    description: 'Measure the impact of livelihood programs on household income',
    status: 'published',
    sectionsCount: 4,
    questionsCount: 20,
    responsesCount: 67,
    completionRate: 71.5,
    lastResponseAt: '2026-08-31T12:00:00Z',
    createdAt: '2026-08-05T08:00:00Z',
    updatedAt: '2026-08-31T12:00:00Z'
  },
  {
    id: 'sur_005',
    title: 'Food Security Assessment',
    description: 'Assess food availability, access, and utilization in target communities',
    status: 'draft',
    sectionsCount: 5,
    questionsCount: 26,
    responsesCount: 0,
    completionRate: null,
    lastResponseAt: null,
    createdAt: '2026-08-28T14:00:00Z',
    updatedAt: '2026-08-30T09:00:00Z'
  },
  {
    id: 'sur_006',
    title: 'Maternal & Child Health Survey',
    description: 'Evaluate maternal and child health service delivery in target areas',
    status: 'published',
    sectionsCount: 7,
    questionsCount: 35,
    responsesCount: 203,
    completionRate: 85.7,
    lastResponseAt: '2026-09-01T07:15:00Z',
    createdAt: '2026-07-15T10:00:00Z',
    updatedAt: '2026-09-01T07:15:00Z'
  },
  {
    id: 'sur_007',
    title: 'Youth Employment Needs',
    description: 'Identify employment needs and skills gaps among youth in target communities',
    status: 'archived',
    sectionsCount: 3,
    questionsCount: 15,
    responsesCount: 56,
    completionRate: 68.3,
    lastResponseAt: '2026-06-20T10:00:00Z',
    createdAt: '2026-05-10T08:00:00Z',
    updatedAt: '2026-06-20T10:00:00Z'
  },
  {
    id: 'sur_008',
    title: 'Governance & Participation Survey',
    description: 'Assess community participation in local governance processes',
    status: 'draft',
    sectionsCount: 4,
    questionsCount: 22,
    responsesCount: 0,
    completionRate: null,
    lastResponseAt: null,
    createdAt: '2026-08-30T11:00:00Z',
    updatedAt: '2026-08-30T11:00:00Z'
  }
];

export async function getSurveysList(
  filters: SurveyListFilters
): Promise<SurveyListResponse> {
  await delay(200);

  let result = [...MOCK_SURVEYS];

  // Search filter
  if (filters.search) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q)
    );
  }

  // Status filter
  if (filters.status) {
    result = result.filter((s) => s.status === filters.status);
  }

  // Sort
  if (filters.sort) {
    const [field, dir] = filters.sort.split(':');
    result.sort((a, b) => {
      const aVal = a[field as keyof SurveyListItem];
      const bVal = b[field as keyof SurveyListItem];
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return dir === 'desc'
          ? bVal.localeCompare(aVal)
          : aVal.localeCompare(bVal);
      }
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return dir === 'desc' ? bVal - aVal : aVal - bVal;
      }
      return 0;
    });
  }

  return { surveys: result, total: result.length };
}
