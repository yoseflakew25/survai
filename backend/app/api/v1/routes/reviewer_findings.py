"""Reviewer findings — status updates (accept / dismiss)."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter

from app.api.deps import CurrentUser, ReviewerServiceDep
from app.schemas.reviewer import FindingStatusUpdate, ReviewerFindingPublic

router = APIRouter(prefix="/reviewer-findings", tags=["reviewer"])


@router.patch("/{finding_id}", response_model=ReviewerFindingPublic)
async def update_finding_status(
    finding_id: UUID,
    body: FindingStatusUpdate,
    current_user: CurrentUser,
    reviewer: ReviewerServiceDep,
) -> ReviewerFindingPublic:
    return await reviewer.update_finding_status(
        user=current_user, finding_id=finding_id, body=body
    )
