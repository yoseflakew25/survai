"""Job queue helpers — inline by default (Redis opt-in only)."""

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.core.exceptions import NotFoundError
from app.jobs.queue import (
    assert_job_visible_to_user,
    enqueue_job,
    get_job_status,
    jobs_enabled,
)
from app.models.user import User, UserRole


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


@pytest.mark.asyncio
async def test_assert_job_owner_denies_other_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner_id = uuid4()
    other = User(
        id=uuid4(),
        email="other@example.com",
        role=UserRole.researcher,
        organization_id=uuid4(),
        is_active=True,
        email_verified=True,
    )

    async def _resolve(_job_id: str) -> str | None:
        return str(owner_id)

    monkeypatch.setattr("app.jobs.queue.jobs_enabled", lambda: True)
    monkeypatch.setattr("app.jobs.queue.resolve_job_owner", _resolve)

    with pytest.raises(NotFoundError):
        await assert_job_visible_to_user(job_id="job-abc", user=other)


@pytest.mark.asyncio
async def test_assert_job_owner_allows_enqueueing_user(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    user_id = uuid4()
    user = User(
        id=user_id,
        email="owner@example.com",
        role=UserRole.organization,
        organization_id=uuid4(),
        is_active=True,
        email_verified=True,
    )

    async def _resolve(_job_id: str) -> str | None:
        return str(user_id)

    monkeypatch.setattr("app.jobs.queue.jobs_enabled", lambda: True)
    monkeypatch.setattr("app.jobs.queue.resolve_job_owner", _resolve)

    await assert_job_visible_to_user(job_id="job-abc", user=user)
