"""Survey Reviewer — questionnaire → ReviewerOutput."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import StructuredCallResult, call_structured
from app.ai.prompts import reviewer_v1
from app.ai.schemas import ReviewerOutput


async def review_survey(
    *,
    plan: dict[str, Any] | None,
    survey: dict[str, Any],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> StructuredCallResult:
    return await call_structured(
        feature="reviewer",
        system=reviewer_v1.SYSTEM,
        user=reviewer_v1.user_prompt_review(plan=plan, survey=survey),
        schema=ReviewerOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "survey_id": str(survey.get("id")) if survey.get("id") else None,
            "plan_id": str(plan.get("id")) if plan and plan.get("id") else None,
            "question_count": sum(
                len(s.get("questions") or []) for s in (survey.get("sections") or [])
            ),
            "section_count": len(survey.get("sections") or []),
        },
    )
