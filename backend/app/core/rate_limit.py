"""Lightweight in-process rate limiting for auth and public collection."""

from __future__ import annotations

import time
from collections import defaultdict
from dataclasses import dataclass

from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from app.core.cache import rate_limit_incr
from app.core.config import settings


def _client_key(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


@dataclass(frozen=True)
class RateRule:
    prefix: str
    max_requests: int
    window_seconds: float


# Path prefixes under /api/v1
DEFAULT_RULES: tuple[RateRule, ...] = (
    RateRule("/api/v1/auth/login", 20, 60.0),
    RateRule("/api/v1/auth/register", 10, 60.0),
    RateRule("/api/v1/auth/verify-email", 20, 60.0),
    RateRule("/api/v1/auth/resend-verification", 10, 60.0),
    RateRule("/api/v1/auth/forgot-password", 10, 60.0),
    RateRule("/api/v1/auth/google", 30, 60.0),
    RateRule("/api/v1/public/", 120, 60.0),
)


class SlidingWindowLimiter:
    def __init__(self) -> None:
        self._hits: dict[str, list[float]] = defaultdict(list)

    def allow(self, key: str, rule: RateRule) -> bool:
        now = time.monotonic()
        window_start = now - rule.window_seconds
        bucket = self._hits[key]
        while bucket and bucket[0] < window_start:
            bucket.pop(0)
        if len(bucket) >= rule.max_requests:
            return False
        bucket.append(now)
        return True


_limiter = SlidingWindowLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: ASGIApp, rules: tuple[RateRule, ...] = DEFAULT_RULES) -> None:
        super().__init__(app)
        self._rules = rules

    async def dispatch(self, request: Request, call_next):  # type: ignore[no-untyped-def]
        if settings.environment == "test":
            return await call_next(request)

        path = request.url.path
        if request.method not in ("POST", "PUT", "PATCH"):
            return await call_next(request)

        for rule in self._rules:
            if not path.startswith(rule.prefix):
                continue
            client = _client_key(request)
            key = f"{rule.prefix}:{client}"
            redis_key = f"rl:{rule.prefix}:{client}"
            count = await rate_limit_incr(
                redis_key, ttl_seconds=int(rule.window_seconds)
            )
            over_limit = (
                count is not None
                and count > rule.max_requests
            ) or (
                count is None and not _limiter.allow(key, rule)
            )
            if over_limit:
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "detail": "Too many requests. Please wait a moment and try again."
                    },
                    headers={"Retry-After": str(int(rule.window_seconds))},
                )
            break

        return await call_next(request)
