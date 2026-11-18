"""Structured CSO / NGO organization profile for future assistant knowledge indexing."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class CsoLegalIdentity(BaseModel):
    legal_name: str | None = Field(default=None, max_length=255)
    acronym: str | None = Field(default=None, max_length=64)
    registration_number: str | None = Field(default=None, max_length=120)
    registration_country: str | None = Field(default=None, max_length=120)
    year_founded: int | None = Field(default=None, ge=1800, le=2100)
    legal_status: str | None = Field(
        default=None,
        max_length=120,
        description="e.g. national NGO, CBO, faith-based, cooperative",
    )


class CsoMission(BaseModel):
    mission: str | None = Field(default=None, max_length=4000)
    vision: str | None = Field(default=None, max_length=2000)
    core_values: str | None = Field(default=None, max_length=2000)
    theory_of_change: str | None = Field(default=None, max_length=4000)


class CsoGeography(BaseModel):
    headquarters_city: str | None = Field(default=None, max_length=120)
    headquarters_country: str | None = Field(default=None, max_length=120)
    regions_served: str | None = Field(
        default=None, max_length=2000, description="Woredas, regions, provinces…"
    )
    countries_of_operation: str | None = Field(default=None, max_length=1000)
    urban_rural_focus: str | None = Field(default=None, max_length=500)


class CsoPrograms(BaseModel):
    primary_themes: str | None = Field(
        default=None,
        max_length=2000,
        description="Thematic areas, one per line",
    )
    flagship_programs: str | None = Field(default=None, max_length=4000)
    target_populations: str | None = Field(default=None, max_length=2000)
    approximate_annual_beneficiaries: str | None = Field(default=None, max_length=500)
    typical_project_duration: str | None = Field(default=None, max_length=500)


class CsoStakeholders(BaseModel):
    main_donors_funders: str | None = Field(default=None, max_length=2000)
    government_partners: str | None = Field(default=None, max_length=2000)
    peer_csos: str | None = Field(default=None, max_length=2000)
    community_structures: str | None = Field(
        default=None, max_length=2000, description="Co-ops, associations, elders…"
    )


class CsoMeCapacity(BaseModel):
    me_team_description: str | None = Field(default=None, max_length=2000)
    typical_survey_types: str | None = Field(default=None, max_length=2000)
    data_collection_methods: str | None = Field(
        default=None, max_length=1000, description="Kobo, ODK, paper, phone…"
    )
    reporting_audiences: str | None = Field(default=None, max_length=1000)
    indicators_frameworks: str | None = Field(
        default=None, max_length=2000, description="Logframes, SDGs, donor templates…"
    )


class CsoLanguages(BaseModel):
    working_languages: str | None = Field(default=None, max_length=500)
    survey_languages: str | None = Field(default=None, max_length=500)
    translation_support: str | None = Field(default=None, max_length=1000)
    accessibility_inclusion_notes: str | None = Field(default=None, max_length=2000)


class CsoGovernance(BaseModel):
    executive_lead: str | None = Field(default=None, max_length=255)
    board_chair: str | None = Field(default=None, max_length=255)
    board_size: str | None = Field(default=None, max_length=120)
    staff_count_approx: str | None = Field(default=None, max_length=120)
    volunteer_engagement: str | None = Field(default=None, max_length=1000)


class CsoEthicsData(BaseModel):
    data_protection_policies: str | None = Field(default=None, max_length=2000)
    consent_practices: str | None = Field(default=None, max_length=2000)
    sensitive_topics_policy: str | None = Field(default=None, max_length=2000)
    ai_usage_boundaries: str | None = Field(
        default=None,
        max_length=2000,
        description="What may / may not be sent to external AI",
    )


class OrganizationCsoProfile(BaseModel):
    """Nested profile persisted on organizations.cso_profile."""

    legal: CsoLegalIdentity = Field(default_factory=CsoLegalIdentity)
    mission: CsoMission = Field(default_factory=CsoMission)
    geography: CsoGeography = Field(default_factory=CsoGeography)
    programs: CsoPrograms = Field(default_factory=CsoPrograms)
    stakeholders: CsoStakeholders = Field(default_factory=CsoStakeholders)
    me_capacity: CsoMeCapacity = Field(default_factory=CsoMeCapacity)
    languages: CsoLanguages = Field(default_factory=CsoLanguages)
    governance: CsoGovernance = Field(default_factory=CsoGovernance)
    ethics: CsoEthicsData = Field(default_factory=CsoEthicsData)
    additional_context: str | None = Field(
        default=None,
        max_length=4000,
        description="Anything else the assistant should know",
    )

    @field_validator(
        "legal",
        "mission",
        "geography",
        "programs",
        "stakeholders",
        "me_capacity",
        "languages",
        "governance",
        "ethics",
        mode="before",
    )
    @classmethod
    def _coerce_section(cls, value: Any) -> Any:
        return value or {}


def parse_cso_profile(raw: Any) -> OrganizationCsoProfile:
    if raw is None or raw == {}:
        return OrganizationCsoProfile()
    if isinstance(raw, OrganizationCsoProfile):
        return raw
    return OrganizationCsoProfile.model_validate(raw)


def empty_cso_profile_dict() -> dict[str, Any]:
    return OrganizationCsoProfile().model_dump()


class CsoProfileDocumentExtractResponse(BaseModel):
    """Proposed profile from document upload — not persisted until user saves."""

    organization_name: str | None = None
    organization_description: str | None = None
    organization_cso_profile: OrganizationCsoProfile
    source_filename: str
    characters_extracted: int


class CsoProfileExtractionOutput(BaseModel):
    """LLM structured output when parsing a CSO document."""

    organization_name: str | None = Field(default=None, max_length=100)
    organization_description: str | None = Field(default=None, max_length=2000)
    profile: OrganizationCsoProfile = Field(default_factory=OrganizationCsoProfile)