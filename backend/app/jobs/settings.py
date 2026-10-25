"""ARQ worker settings — optional until Redis is wired in deploy."""

from __future__ import annotations

from app.core.config import settings


def redis_dsn() -> str | None:
    return getattr(settings, "redis_url", None) or None
