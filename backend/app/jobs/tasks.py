"""ARQ task callables (long AI / export jobs)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


async def ping_job(ctx: dict[str, Any] | None = None) -> dict[str, str]:
    """Health probe for the worker process."""
    logger.info("ARQ ping ok ctx_keys=%s", list((ctx or {}).keys()))
    return {"status": "ok"}


async def export_report_job(
    ctx: dict[str, Any] | None = None,
    *,
    report_id: str | UUID,
    export_type: str = "markdown",
) -> dict[str, str]:
    """Placeholder long export — production will call WeasyPrint/docxtpl here."""
    logger.info(
        "export_report_job queued report_id=%s type=%s", report_id, export_type
    )
    return {
        "status": "queued_inline",
        "report_id": str(report_id),
        "type": export_type,
    }
