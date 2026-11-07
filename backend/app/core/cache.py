"""Optional Redis cache for hot read paths (overview, etc.).

Uses REDIS_URL when set. Failures are swallowed so the API never depends on
Redis being up — same philosophy as ARQ jobs.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)

_redis: Any | None = None
_redis_failed = False


async def _client() -> Any | None:
    global _redis, _redis_failed
    if _redis_failed:
        return None
    url = (settings.redis_url or "").strip()
    if not url:
        return None
    if _redis is not None:
        return _redis
    try:
        from redis.asyncio import Redis

        _redis = Redis.from_url(url, decode_responses=True)
        await _redis.ping()
        return _redis
    except Exception:
        logger.warning("Redis cache unavailable — continuing without cache", exc_info=True)
        _redis_failed = True
        _redis = None
        return None


async def cache_get_json(key: str) -> Any | None:
    client = await _client()
    if client is None:
        return None
    try:
        raw = await client.get(key)
        if raw is None:
            return None
        return json.loads(raw)
    except Exception:
        logger.debug("cache_get_json failed key=%s", key, exc_info=True)
        return None


async def cache_set_json(key: str, value: Any, *, ttl_seconds: int) -> None:
    client = await _client()
    if client is None:
        return
    try:
        await client.set(key, json.dumps(value, default=str), ex=ttl_seconds)
    except Exception:
        logger.debug("cache_set_json failed key=%s", key, exc_info=True)


async def cache_delete(key: str) -> None:
    client = await _client()
    if client is None:
        return
    try:
        await client.delete(key)
    except Exception:
        logger.debug("cache_delete failed key=%s", key, exc_info=True)


async def close_cache() -> None:
    global _redis, _redis_failed
    if _redis is not None:
        try:
            await _redis.aclose()
        except Exception:
            pass
    _redis = None
    _redis_failed = False
