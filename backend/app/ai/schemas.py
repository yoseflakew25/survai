"""Strict structured-output schemas for Gemini (plan.md §8)."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

QuestionTypeLiteral = Literal[
    "short_text",
    "long_text",
    "single_choice",
    "multiple_choice",
    "dropdown",
    "rating_scale",
    "number",
    "date",
]


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


# --- Builder ---


class DraftQuestion(BaseModel):
    """Builder draft question.

    Keep this schema Gemini-simple: no min/max Length/Items and no nullable
    arrays (anyOf). Empty options/help_text mean “none”.
    """

    prompt_text: str
    type: QuestionTypeLiteral
    options: list[str] = Field(default_factory=list)
    is_required: bool = False
    help_text: str = ""


class DraftSection(BaseModel):
    title: str
    questions: list[DraftQuestion]


class SurveyDraftOutput(BaseModel):
    sections: list[DraftSection]
    notes: str = ""


class SectionDraftOutput(BaseModel):
    """Single-section regenerate (BLD-02)."""

    title: str
    questions: list[DraftQuestion]
    notes: str = ""


# --- Reviewer (Gemini-simple: no nested min/max Length) ---

IssueTypeLiteral = Literal[
    "leading_wording",
    "double_barreled",
    "ambiguous",
    "objective_misalignment",
    "other",
]


class ReviewScoreCriterion(BaseModel):
    label: str
    score: float
    description: str


class ReviewFindingItem(BaseModel):
    question_id: str = ""
    issue_type: IssueTypeLiteral
    explanation: str
    suggested_rewrite: str = ""


class ReviewerOutput(BaseModel):
    overall_quality_score: float
    estimated_completion_minutes: int
    required_question_count: int
    score_criteria: list[ReviewScoreCriterion]
    findings: list[ReviewFindingItem]
    notes: str = ""


# --- Reports (Gemini-simple nested statements) ---


class GroundedStatement(BaseModel):
    text: str
    metric_ref: str = ""


class ReportSectionAI(BaseModel):
    heading: str
    statements: list[GroundedStatement]


class ReportGenerationOutput(BaseModel):
    """Full narrative report — each field is a multi-paragraph section."""

    executive_summary: ReportSectionAI
    methodology: ReportSectionAI
    respondent_profile: ReportSectionAI
    key_findings: ReportSectionAI
    detailed_analysis: ReportSectionAI
    cross_cutting_insights: ReportSectionAI
    limitations: ReportSectionAI
    recommendations: ReportSectionAI
    implications_and_next_steps: ReportSectionAI
    conclusion: ReportSectionAI


class ReportChatOutput(BaseModel):
    answer: str
    metric_refs: list[str] = Field(default_factory=list)
    confidence: Literal["grounded", "partial", "insufficient_data"] = "grounded"
