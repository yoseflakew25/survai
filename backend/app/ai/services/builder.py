"""Survey Builder — approved plan → SurveyDraftOutput / SectionDraftOutput."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import StructuredCallResult, call_structured
from app.ai.prompts import builder_v1
from app.ai.schemas import SectionDraftOutput, SurveyDraftOutput


async def generate_survey_draft(
    *,
    plan: dict[str, Any],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> StructuredCallResult:
    return await call_structured(
        feature="builder",
        system=builder_v1.SYSTEM,
        user=builder_v1.user_prompt_draft(plan),
        schema=SurveyDraftOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "plan_id": str(plan.get("id")) if plan.get("id") else None,
            "research_goal_chars": len(str(plan.get("research_goal") or "")),
            "proposed_section_count": len(plan.get("proposed_sections") or []),
        },
    )


async def regenerate_section(
    *,
    plan: dict[str, Any],
    section_title: str,
    section_description: str | None,
    other_section_titles: list[str],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> StructuredCallResult:
    return await call_structured(
        feature="builder",
        system=builder_v1.SYSTEM_SECTION,
        user=builder_v1.user_prompt_section(
            plan,
            section_title=section_title,
            section_description=section_description,
            other_section_titles=other_section_titles,
        ),
        schema=SectionDraftOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "plan_id": str(plan.get("id")) if plan.get("id") else None,
            "section_title": section_title,
            "mode": "section_regenerate",
        },
    )
