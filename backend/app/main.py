"""FastAPI application entrypoint."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import time

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.core.cache import close_cache
from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.services.user import UserService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Log requests slower than this (ms) — lightweight substitute until full OTEL.
_SLOW_REQUEST_MS = 1_500


class SlowRequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[no-untyped-def]
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        if elapsed_ms >= _SLOW_REQUEST_MS:
            logger.warning(
                "slow_request method=%s path=%s status=%s duration_ms=%.0f",
                request.method,
                request.url.path,
                response.status_code,
                elapsed_ms,
            )
        response.headers["X-Response-Time-Ms"] = f"{elapsed_ms:.0f}"
        return response


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    if settings.environment != "test":
        try:
            async with AsyncSessionLocal() as session:
                service = UserService(session)
                created = await service.ensure_first_superuser()
                await session.commit()
                if created:
                    logger.info("Created first superuser: %s", created.email)
        except Exception:
            # Don't block the API if seed/bootstrap fails (e.g. pending migrations).
            logger.exception("Startup bootstrap failed — API will still serve requests")
    yield
    await close_cache()


app = FastAPI(
    title=settings.app_name,
    version=__version__,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# Outermost first in Starlette: GZip wraps responses after CORS/handlers.
app.add_middleware(GZipMiddleware, minimum_size=500)
app.add_middleware(SlowRequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix=settings.api_v1_prefix)


@app.get("/")
async def root() -> dict[str, str]:
    return {
        "name": settings.app_name,
        "version": __version__,
        "docs": "/docs",
        "health": f"{settings.api_v1_prefix}/health",
    }
