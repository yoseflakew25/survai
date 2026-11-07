"""Survey plans — CRUD + Gemini generate + interview stream."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, status
from fastapi.responses import StreamingResponse

from app.api.deps import CurrentUser, PlanServiceDep
from app.core.exceptions import AppError
from app.schemas.plan import (
    PlanCreate,
    PlanGenerateRequest,
    PlanInterviewTurnRequest,
    PlanInterviewTurnResponse,
    PlanListResponse,
    PlanPublic,
    PlanUpdate,
    SurveyPlanGenerateResponse,
)

router = APIRouter(prefix="/plans", tags=["plans"])


@router.get("", response_model=PlanListResponse)
async def list_plans(
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> PlanListResponse:
    return await plans.list_plans(user=current_user)


@router.post("", response_model=PlanPublic, status_code=status.HTTP_201_CREATED)
async def create_plan(
    body: PlanCreate,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> PlanPublic:
    return await plans.create_plan(user=current_user, body=body)


@router.post(
    "/generate",
    response_model=SurveyPlanGenerateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_plan_with_ai(
    body: PlanCreate,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> SurveyPlanGenerateResponse:
    """Create a plan from a research goal and run the Gemini planner."""
    return await plans.create_and_generate(user=current_user, body=body)


@router.post("/interview/turn/stream")
async def plan_interview_turn_stream(
    body: PlanInterviewTurnRequest,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> StreamingResponse:
    """SSE plan interview turn — status → delta → done (stateless transcript)."""

    async def event_gen() -> AsyncIterator[str]:
        try:
            async for event, payload in plans.iter_interview_turn(
                user=current_user, body=body, stream_deltas=True
            ):
                if event == "done":
                    assert isinstance(payload, PlanInterviewTurnResponse)
                    data = payload.model_dump(mode="json")
                else:
                    data = payload
                yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
        except AppError as exc:
            yield (
                "event: error\n"
                f"data: {json.dumps({'detail': exc.detail, 'status_code': exc.status_code})}\n\n"
            )
        except Exception:
            yield (
                "event: error\n"
                f"data: {json.dumps({'detail': 'Plan interview stream failed'})}\n\n"
            )

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/{plan_id}", response_model=PlanPublic)
async def get_plan(
    plan_id: UUID,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> PlanPublic:
    return await plans.get_plan(user=current_user, plan_id=plan_id)


@router.patch("/{plan_id}", response_model=PlanPublic)
async def update_plan(
    plan_id: UUID,
    body: PlanUpdate,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> PlanPublic:
    return await plans.update_plan(user=current_user, plan_id=plan_id, body=body)


@router.post("/{plan_id}/generate", response_model=SurveyPlanGenerateResponse)
async def generate_plan(
    plan_id: UUID,
    current_user: CurrentUser,
    plans: PlanServiceDep,
    body: PlanGenerateRequest | None = None,
) -> SurveyPlanGenerateResponse:
    """Hard-replace plan AI fields from the research goal (optional goal override)."""
    return await plans.generate(
        user=current_user,
        plan_id=plan_id,
        research_goal=body.research_goal if body else None,
    )


@router.post("/{plan_id}/approve", response_model=PlanPublic)
async def approve_plan(
    plan_id: UUID,
    current_user: CurrentUser,
    plans: PlanServiceDep,
) -> PlanPublic:
    return await plans.approve_plan(user=current_user, plan_id=plan_id)
