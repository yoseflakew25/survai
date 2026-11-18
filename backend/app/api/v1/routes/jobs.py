"""Poll ARQ job status."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser
from app.jobs.queue import assert_job_visible_to_user, get_job_status
from app.schemas.jobs import JobStatusResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("/{job_id}", response_model=JobStatusResponse)
async def poll_job(
    job_id: str,
    current_user: CurrentUser,
) -> JobStatusResponse:
    await assert_job_visible_to_user(job_id=job_id, user=current_user)
    raw = await get_job_status(job_id)
    return JobStatusResponse.model_validate(raw)
