"""Survey Planner — research goal → SurveyPlanOutput."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import StructuredCallResult, call_structured
from app.ai.prompts import planner_v1
from app.ai.schemas import SurveyPlanOutput


async def generate_survey_plan(
    *,
    research_goal: str,
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> StructuredCallResult:
    goal = research_goal.strip()
    return await call_structured(
        feature="planner",
        system=planner_v1.SYSTEM,
        user=planner_v1.user_prompt(goal),
        schema=SurveyPlanOutput,
        user_id=user_id,
        session=session,
        input_meta={"research_goal_chars": len(goal)},
    )
