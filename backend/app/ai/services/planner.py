"""Survey Planner — research goal → SurveyPlanOutput + interview turns."""

from __future__ import annotations

from collections.abc import AsyncIterator
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import (
    StructuredCallResult,
    call_structured,
    iter_stream_structured,
)
from app.ai.prompts import planner_interview_v1, planner_v1
from app.ai.schemas import PlanInterviewTurnOutput, SurveyPlanOutput


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


def _interview_history(
    history: list[dict[str, Any]],
) -> list[dict[str, str]]:
    cleaned_history: list[dict[str, str]] = []
    for item in history:
        if not isinstance(item, dict):
            continue
        role = str(item.get("role") or "").strip()
        text = str(item.get("content") or "").strip()
        if role not in {"user", "assistant"} or not text:
            continue
        cleaned_history.append({"role": role, "content": text})
    return cleaned_history


async def interview_plan_turn(
    *,
    content: str,
    history: list[dict[str, Any]],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> StructuredCallResult:
    """One multi-turn interview reply before full plan generation."""
    cleaned_history = _interview_history(history)
    return await call_structured(
        feature="planner_interview",
        system=planner_interview_v1.SYSTEM,
        user=planner_interview_v1.user_prompt(
            content=content, history=cleaned_history
        ),
        schema=PlanInterviewTurnOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "history_turns": len(cleaned_history),
            "content_chars": len(content.strip()),
        },
    )


async def iter_interview_plan_turn(
    *,
    content: str,
    history: list[dict[str, Any]],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
) -> AsyncIterator[tuple[str, Any]]:
    """Stream interview deltas, then the validated structured result."""
    cleaned_history = _interview_history(history)
    async for event in iter_stream_structured(
        feature="planner_interview",
        system=planner_interview_v1.SYSTEM,
        user=planner_interview_v1.user_prompt(
            content=content, history=cleaned_history
        ),
        schema=PlanInterviewTurnOutput,
        stream_field="assistant_reply",
        user_id=user_id,
        session=session,
        input_meta={
            "history_turns": len(cleaned_history),
            "content_chars": len(content.strip()),
        },
    ):
        yield event
