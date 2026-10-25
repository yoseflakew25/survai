"""Enqueue helpers — ARQ when Redis is configured, else inline."""

from __future__ import annotations

import logging
from collections.abc import Awaitable, Callable
from typing import Any

from app.jobs.settings import redis_dsn

logger = logging.getLogger(__name__)


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


async def enqueue(
    coro_factory: Callable[..., Awaitable[Any]],
    *args: Any,
    job_name: str | None = None,
    **kwargs: Any,
) -> Any:
    """Run job via ARQ when Redis is up; otherwise await inline."""
    redis_settings = get_redis_settings()
    if redis_settings is None:
        logger.debug("Inline job %s", job_name or getattr(coro_factory, "__name__", "?"))
        return await coro_factory(*args, **kwargs)

    try:
        from arq import create_pool

        redis = await create_pool(redis_settings)
        job = await redis.enqueue_job(
            job_name or coro_factory.__name__, *args, **kwargs
        )
        return job
    except Exception:
        logger.exception("ARQ enqueue failed; running inline")
        return await coro_factory(*args, **kwargs)
