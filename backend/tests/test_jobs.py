"""Job queue helpers — inline by default (Redis opt-in only)."""

import pytest
from httpx import AsyncClient

from app.jobs.queue import enqueue_job, get_job_status, jobs_enabled


@pytest.mark.asyncio
async def test_jobs_disabled_by_default() -> None:
    assert jobs_enabled() is False
    assert await enqueue_job("ping_job") is None


@pytest.mark.asyncio
async def test_job_status_inline_mode() -> None:
    raw = await get_job_status("missing-job")
    assert raw["status"] == "not_found"
    assert "inline" in (raw.get("error") or "").lower() or "not configured" in (
        raw.get("error") or ""
    ).lower()


@pytest.mark.asyncio
async def test_jobs_poll_requires_auth(client: AsyncClient) -> None:
    res = await client.get("/api/v1/jobs/not-a-real-job")
    assert res.status_code == 401
