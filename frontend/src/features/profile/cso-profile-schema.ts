import * as z from 'zod';

const opt = (max: number) =>
  z
    .string()
    .max(max)
    .optional()
    .or(z.literal(''));

const legalSchema = z.object({
  legal_name: opt(255),
  acronym: opt(64),
  registration_number: opt(120),
  registration_country: opt(120),
  year_founded: z.string().max(4).optional(),
  legal_status: opt(120)
});

const missionSchema = z.object({
  mission: opt(4000),
  vision: opt(2000),
  core_values: opt(2000),
  theory_of_change: opt(4000)
});

const geographySchema = z.object({
  headquarters_city: opt(120),
  headquarters_country: opt(120),
  regions_served: opt(2000),
  countries_of_operation: opt(1000),
  urban_rural_focus: opt(500)
});

const programsSchema = z.object({
  primary_themes: opt(2000),
  flagship_programs: opt(4000),
  target_populations: opt(2000),
  approximate_annual_beneficiaries: opt(500),
  typical_project_duration: opt(500)
});

const stakeholdersSchema = z.object({
  main_donors_funders: opt(2000),
  government_partners: opt(2000),
  peer_csos: opt(2000),
  community_structures: opt(2000)
});

const meCapacitySchema = z.object({
  me_team_description: opt(2000),
  typical_survey_types: opt(2000),
  data_collection_methods: opt(1000),
  reporting_audiences: opt(1000),
  indicators_frameworks: opt(2000)
});

const languagesSchema = z.object({
  working_languages: opt(500),
  survey_languages: opt(500),
  translation_support: opt(1000),
  accessibility_inclusion_notes: opt(2000)
});

const governanceSchema = z.object({
  executive_lead: opt(255),
  board_chair: opt(255),
  board_size: opt(120),
  staff_count_approx: opt(120),
  volunteer_engagement: opt(1000)
});

const ethicsSchema = z.object({
  data_protection_policies: opt(2000),
  consent_practices: opt(2000),
  sensitive_topics_policy: opt(2000),
  ai_usage_boundaries: opt(2000)
});

export const csoProfileSchema = z.object({
  legal: legalSchema,
  mission: missionSchema,
  geography: geographySchema,
  programs: programsSchema,
  stakeholders: stakeholdersSchema,
  me_capacity: meCapacitySchema,
  languages: languagesSchema,
  governance: governanceSchema,
  ethics: ethicsSchema,
  additional_context: opt(4000)
});

export type CsoProfileFormValues = z.infer<typeof csoProfileSchema>;

export const EMPTY_CSO_PROFILE: CsoProfileFormValues = {
  legal: {
    legal_name: '',
    acronym: '',
    registration_number: '',
    registration_country: '',
    year_founded: '',
    legal_status: ''
  },
  mission: {
    mission: '',
    vision: '',
    core_values: '',
    theory_of_change: ''
  },
  geography: {
    headquarters_city: '',
    headquarters_country: '',
    regions_served: '',
    countries_of_operation: '',
    urban_rural_focus: ''
  },
  programs: {
    primary_themes: '',
    flagship_programs: '',
    target_populations: '',
    approximate_annual_beneficiaries: '',
    typical_project_duration: ''
  },
  stakeholders: {
    main_donors_funders: '',
    government_partners: '',
    peer_csos: '',
    community_structures: ''
  },
  me_capacity: {
    me_team_description: '',
    typical_survey_types: '',
    data_collection_methods: '',
    reporting_audiences: '',
    indicators_frameworks: ''
  },
  languages: {
    working_languages: '',
    survey_languages: '',
    translation_support: '',
    accessibility_inclusion_notes: ''
  },
  governance: {
    executive_lead: '',
    board_chair: '',
    board_size: '',
    staff_count_approx: '',
    volunteer_engagement: ''
  },
  ethics: {
    data_protection_policies: '',
    consent_practices: '',
    sensitive_topics_policy: '',
    ai_usage_boundaries: ''
  },
  additional_context: ''
};

/** Map API snake_case payload → form defaults. */
export function csoProfileFromApi(
  raw: Record<string, unknown> | null | undefined
): CsoProfileFormValues {
  if (!raw || typeof raw !== 'object') {
    return { ...EMPTY_CSO_PROFILE };
  }
  const parsed = csoProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return { ...EMPTY_CSO_PROFILE, ...raw } as CsoProfileFormValues;
  }
  const data = parsed.data;
  return {
    ...EMPTY_CSO_PROFILE,
    ...data,
    legal: { ...EMPTY_CSO_PROFILE.legal, ...data.legal },
    mission: { ...EMPTY_CSO_PROFILE.mission, ...data.mission },
    geography: { ...EMPTY_CSO_PROFILE.geography, ...data.geography },
    programs: { ...EMPTY_CSO_PROFILE.programs, ...data.programs },
    stakeholders: { ...EMPTY_CSO_PROFILE.stakeholders, ...data.stakeholders },
    me_capacity: { ...EMPTY_CSO_PROFILE.me_capacity, ...data.me_capacity },
    languages: { ...EMPTY_CSO_PROFILE.languages, ...data.languages },
    governance: { ...EMPTY_CSO_PROFILE.governance, ...data.governance },
    ethics: { ...EMPTY_CSO_PROFILE.ethics, ...data.ethics }
  };
}

type MergeMode = 'empty' | 'all';

function mergeOptionalString(
  current: string | undefined,
  incoming: string | undefined,
  mode: MergeMode
): string {
  const next = (incoming ?? '').trim();
  if (!next) return current ?? '';
  if (mode === 'all') return next;
  const existing = (current ?? '').trim();
  return existing || next;
}

function mergeSection<T extends Record<string, string | undefined>>(
  current: T,
  incoming: T,
  mode: MergeMode
): T {
  const out = { ...current };
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    out[key] = mergeOptionalString(
      current[key],
      incoming[key],
      mode
    ) as T[keyof T];
  }
  return out;
}

export function mergeProfileText(
  current: string | undefined,
  incoming: string | null | undefined,
  mode: MergeMode
): string {
  return mergeOptionalString(current, incoming ?? undefined, mode);
}

/** Apply extracted CSO profile into the form (empty-only or overwrite). */
export function mergeCsoProfileForm(
  current: CsoProfileFormValues,
  extracted: CsoProfileFormValues,
  mode: MergeMode
): CsoProfileFormValues {
  return {
    legal: mergeSection(current.legal, extracted.legal, mode),
    mission: mergeSection(current.mission, extracted.mission, mode),
    geography: mergeSection(current.geography, extracted.geography, mode),
    programs: mergeSection(current.programs, extracted.programs, mode),
    stakeholders: mergeSection(current.stakeholders, extracted.stakeholders, mode),
    me_capacity: mergeSection(current.me_capacity, extracted.me_capacity, mode),
    languages: mergeSection(current.languages, extracted.languages, mode),
    governance: mergeSection(current.governance, extracted.governance, mode),
    ethics: mergeSection(current.ethics, extracted.ethics, mode),
    additional_context: mergeOptionalString(
      current.additional_context,
      extracted.additional_context,
      mode
    )
  };
}

export function csoProfileToApi(
  values: CsoProfileFormValues
): Record<string, unknown> {
  const year = values.legal.year_founded?.trim() ?? '';
  const parsedYear =
    year === '' || Number.isNaN(Number(year)) ? null : Number(year);
  return {
    ...values,
    legal: {
      ...values.legal,
      year_founded: parsedYear
    }
  };
}