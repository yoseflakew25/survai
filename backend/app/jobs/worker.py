"""ARQ worker entry — `arq app.jobs.worker.WorkerSettings` when Redis is ready."""

from __future__ import annotations

from typing import Any

from app.jobs.queue import get_redis_settings
from app.jobs.tasks import export_report_job, ping_job


class WorkerSettings:
    functions = [ping_job, export_report_job]
    redis_settings = get_redis_settings()
    max_jobs = 5

    @staticmethod
    async def on_startup(ctx: dict[str, Any]) -> None:
        ctx["ready"] = True

    @staticmethod
    async def on_shutdown(ctx: dict[str, Any]) -> None:
        ctx.clear()
