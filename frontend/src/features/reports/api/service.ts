// ============================================================
// Reports Service — Mock Data Layer
// ============================================================

import type { SurveyReport, ReportSection } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- Mock report ----

const MOCK_SECTIONS: ReportSection[] = [
  {
    id: 'sec_1',
    title: 'Executive Summary',
    content:
      'This report presents findings from the Community Health Assessment 2026, conducted across DICDO target communities between August and September 2026. The survey captured health status, healthcare access patterns, and community health needs to inform program design and resource allocation.\n\n**Key highlights**\n\n- 142 completed responses collected from 8 target communities (78.3% completion rate)\n- Hypertension (32%) and diabetes (18%) are the most prevalent chronic conditions\n- 67% of respondents access healthcare quarterly or less frequently\n- Distance (42%) and cost (35%) are the top barriers to care\n\nOverall, while healthcare awareness is moderate, significant barriers remain in access and utilization — particularly for vulnerable populations. The recommendations in this report prioritize mobile services, subsidized care, and community education.'
  },
  {
    id: 'sec_2',
    title: 'Methodology',
    content:
      'The survey was administered to 142 respondents across 8 target communities using a structured questionnaire. Data collection ran from August 15 to September 1, 2026, employing both digital (tablet-based) and paper-based methods to ensure broad coverage.\n\n**Sampling** — Respondents were recruited through community health committees using stratified random sampling by village and age group (18–24, 25–34, 35–44, 45–54, 55+).\n\n**Instrument** — The questionnaire covered five domains: household demographics, health status and conditions, healthcare access, preventive practices, and barriers to care. It included 24 questions across 5 sections, with a median completion time of 12 minutes.\n\n**Data quality** — All submissions were validated for completeness; incomplete responses were followed up by field enumerators, yielding a 78.3% completion rate.'
  },
  {
    id: 'sec_3',
    title: 'Key Findings',
    content:
      '1. **Health Conditions** — Hypertension (32%) and diabetes (18%) are the most commonly reported chronic conditions. 1 in 4 respondents reports at least one chronic condition.\n\n2. **Healthcare Access** — 67% of respondents access healthcare quarterly or less frequently. Distance to facilities and cost of services are the primary drivers of low utilization.\n\n3. **Preventive Practices** — Awareness of preventive health measures varies significantly by age group: 71% of respondents aged 18–24 report high awareness versus 44% of those aged 55+.\n\n4. **Barriers** — The top three barriers identified are distance to facilities (42%), cost of services (35%), and availability of medications (28%). Women were 1.4× more likely than men to report cost as a barrier.'
  },
  {
    id: 'sec_4',
    title: 'Recommendations',
    content:
      'Based on the findings, the following recommendations are proposed for the next program cycle:\n\n1. **Expand mobile health clinics** to underserved communities, prioritizing the 4 villages with the highest reported distance barriers.\n2. **Implement subsidized healthcare programs** targeting vulnerable populations — the elderly, chronic-disease patients, and low-income households.\n3. **Launch community health education campaigns** focused on preventive practices, with age-specific messaging for the 55+ segment.\n4. **Establish community health worker networks** for ongoing support and referral, with quarterly refresher training.\n5. **Strengthen the supply chain** for essential medications at the 6 health posts with recurring stockouts.'
  }
];

// ---- Service functions ----

export async function getReport(surveyId: string): Promise<SurveyReport> {
  await delay(200);
  return {
    id: `rep_${surveyId}`,
    surveyId,
    surveyTitle: 'Community Health Assessment 2026',
    model: 'gpt-4o',
    stats: {
      responseCount: 142,
      completionRate: 78.3,
      avgCompletionMinutes: 12,
      questionsCount: 24
    },
    sections: MOCK_SECTIONS,
    createdAt: '2026-09-02T14:30:00Z',
    updatedAt: '2026-09-03T09:15:00Z'
  };
}