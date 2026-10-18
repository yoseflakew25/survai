"""Strict structured-output schemas for Gemini (plan.md §8)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class ProposedSection(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    rationale: str = Field(min_length=1, max_length=1000)


class SurveyPlanOutput(BaseModel):
    objectives: list[str] = Field(min_length=1, max_length=12)
    research_questions: list[str] = Field(min_length=1, max_length=12)
    target_respondents: list[str] = Field(min_length=1, max_length=12)
    proposed_sections: list[ProposedSection] = Field(min_length=1, max_length=12)
    estimated_length_minutes: int = Field(ge=5, le=120)
    notes: str | None = None
