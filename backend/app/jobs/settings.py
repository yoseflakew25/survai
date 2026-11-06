"""ARQ worker settings — Redis is opt-in, never required."""

from __future__ import annotations

from app.core.config import settings


def redis_dsn() -> str | None:
    """Return a Redis DSN only when the queue is explicitly enabled.

    SurvAI does not depend on Redis. Leave JOBS_USE_REDIS=false (default)
    and jobs run inline regardless of whether REDIS_URL is set.
    """
    if not settings.jobs_use_redis:
        return None
    url = (settings.redis_url or "").strip()
    return url or None
