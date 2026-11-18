"""Enqueue helpers — ARQ when Redis is opted in, else callers run inline."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

from app.core.exceptions import NotFoundError
from app.jobs.settings import redis_dsn
from app.models.user import User

logger = logging.getLogger(__name__)

JOB_OWNER_KEY_PREFIX = "survai:job:owner:"
JOB_OWNER_TTL_SEC = 7 * 24 * 3600

# Worker callables that pass enqueueing user_id as the first job arg (after ctx).
_OWNER_FROM_FIRST_ARG = frozenset({"generate_report_job", "export_report_job"})

_pool: Any | None = None
_pool_failed: bool = False


def get_redis_settings() -> Any | None:
    dsn = redis_dsn()
    if not dsn:
        return None
    try:
        from arq.connections import RedisSettings

        return RedisSettings.from_dsn(dsn)
    except Exception:
        logger.warning("ARQ RedisSettings unavailable; falling back to inline jobs")
        return None


def jobs_enabled() -> bool:
    """True only when Redis queue is opted in and not marked failed."""
    if _pool_failed:
        return False
    return get_redis_settings() is not None


async def get_arq_pool() -> Any | None:
    """Shared ARQ pool for enqueue + job status (None → run inline)."""
    global _pool, _pool_failed
    if _pool_failed:
        return None
    settings = get_redis_settings()
    if settings is None:
        return None
    if _pool is None:
        try:
            from arq import create_pool

            _pool = await create_pool(settings)
        except Exception:
            _pool_failed = True
            _pool = None
            logger.exception(
                "Redis/ARQ pool failed — disabling queue; jobs run inline"
            )
            return None
    return _pool


async def record_job_owner(job_id: str, user_id: UUID | str) -> None:
    """Map ARQ job_id → user who enqueued it (for poll authorization)."""
    redis = await get_arq_pool()
    if redis is None:
        return
    key = f"{JOB_OWNER_KEY_PREFIX}{job_id}"
    await redis.set(key, str(user_id), ex=JOB_OWNER_TTL_SEC)


async def resolve_job_owner(job_id: str) -> str | None:
    """Return enqueueing user id if the job exists in Redis/ARQ."""
    redis = await get_arq_pool()
    if redis is None:
        return None

    key = f"{JOB_OWNER_KEY_PREFIX}{job_id}"
    raw = await redis.get(key)
    if raw is not None:
        return raw.decode() if isinstance(raw, bytes) else str(raw)

    from arq.jobs import Job, JobStatus

    job = Job(job_id, redis)
    status = await job.status()
    if status is JobStatus.not_found:
        return None
    info = await job.info()
    if info is None:
        return None
    if info.function in _OWNER_FROM_FIRST_ARG and info.args:
        return str(info.args[0])
    return None


async def assert_job_visible_to_user(*, job_id: str, user: User) -> None:
    """Prevent cross-user job polling (404 to avoid leaking job existence)."""
    if user.is_superuser or not jobs_enabled():
        return
    owner = await resolve_job_owner(job_id)
    if owner is None or str(user.id) != owner:
        raise NotFoundError("Job not found")


async def enqueue_job(
    job_name: str,
    *args: Any,
    owner_user_id: UUID | str | None = None,
    **kwargs: Any,
) -> str | None:
    """Enqueue a named ARQ function. Returns job_id, or None to run inline."""
    global _pool_failed, _pool
    redis = await get_arq_pool()
    if redis is None:
        return None
    try:
        job = await redis.enqueue_job(job_name, *args, **kwargs)
        if job is None:
            logger.warning("ARQ enqueue returned None for %s", job_name)
            return None
        job_id = job.job_id
        owner = owner_user_id
        if owner is None and job_name in _OWNER_FROM_FIRST_ARG and args:
            owner = args[0]
        if owner is not None:
            await record_job_owner(job_id, owner)
        return job_id
    except Exception:
        logger.exception(
            "ARQ enqueue failed for %s — disabling queue; run inline", job_name
        )
        _pool_failed = True
        _pool = None
        return None


async def get_job_status(job_id: str) -> dict[str, Any]:
    """Poll ARQ job status + result payload."""
    from arq.jobs import Job, JobStatus

    redis = await get_arq_pool()
    if redis is None:
        return {
            "job_id": job_id,
            "status": "not_found",
            "result": None,
            "error": "Job queue is not configured (inline mode)",
        }

    job = Job(job_id, redis)
    try:
        status = await job.status()
    except Exception as exc:
        logger.exception("Failed to read job %s", job_id)
        return {
            "job_id": job_id,
            "status": "failed",
            "result": None,
            "error": str(exc),
        }

    status_map = {
        JobStatus.deferred: "deferred",
        JobStatus.queued: "queued",
        JobStatus.in_progress: "in_progress",
        JobStatus.complete: "complete",
        JobStatus.not_found: "not_found",
    }
    mapped = status_map.get(status, "failed")
    result: Any | None = None
    error: str | None = None

    if status is JobStatus.complete:
        try:
            result = await job.result(timeout=0, poll_delay=0)
        except Exception as exc:
            mapped = "failed"
            error = str(exc)

    if isinstance(result, dict):
        payload: dict[str, Any] | None = result
    elif result is not None:
        payload = {"value": result}
    else:
        payload = None

    return {
        "job_id": job_id,
        "status": mapped,
        "result": payload,
        "error": error,
    }
