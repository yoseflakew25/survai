"""ARQ worker entry — `arq app.jobs.worker.WorkerSettings` when Redis is ready."""

from __future__ import annotations

import logging
import sys
from typing import Any

from app.jobs.queue import get_redis_settings
from app.jobs.tasks import export_report_job, generate_report_job, ping_job

logger = logging.getLogger(__name__)

_redis = get_redis_settings()
if _redis is None:
    # Import-time guard so `arq app.jobs.worker.WorkerSettings` fails loudly.
    logger.error("REDIS_URL is empty — cannot start ARQ worker")


class WorkerSettings:
    functions = [ping_job, generate_report_job, export_report_job]
    redis_settings = _redis
    max_jobs = 5
    job_timeout = 600  # long Gemini reports
    keep_result = 3600

    @staticmethod
    async def on_startup(ctx: dict[str, Any]) -> None:
        if get_redis_settings() is None:
            logger.error("REDIS_URL missing at worker startup")
            sys.exit(1)
        ctx["ready"] = True
        logger.info("ARQ worker ready")

    @staticmethod
    async def on_shutdown(ctx: dict[str, Any]) -> None:
        ctx.clear()
