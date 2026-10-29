"""Enqueue helpers — ARQ when Redis is configured, else callers run inline."""

from __future__ import annotations

import logging
from typing import Any

from app.jobs.settings import redis_dsn

logger = logging.getLogger(__name__)

_pool: Any | None = None


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
    return get_redis_settings() is not None


async def get_arq_pool() -> Any | None:
    """Shared ARQ pool for enqueue + job status (None when Redis unset)."""
    global _pool
    settings = get_redis_settings()
    if settings is None:
        return None
    if _pool is None:
        from arq import create_pool

        _pool = await create_pool(settings)
    return _pool


async def enqueue_job(job_name: str, *args: Any, **kwargs: Any) -> str | None:
    """Enqueue a named ARQ function. Returns job_id, or None to run inline."""
    redis = await get_arq_pool()
    if redis is None:
        return None
    try:
        job = await redis.enqueue_job(job_name, *args, **kwargs)
        if job is None:
            logger.warning("ARQ enqueue returned None for %s", job_name)
            return None
        return job.job_id
    except Exception:
        logger.exception("ARQ enqueue failed for %s; caller should run inline", job_name)
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
            "error": "Job queue is not configured",
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
