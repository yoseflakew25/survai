"""ARQ task callables (long AI / export jobs)."""

from __future__ import annotations

import logging
from typing import Any
from uuid import UUID

logger = logging.getLogger(__name__)


async def ping_job(ctx: dict[str, Any]) -> dict[str, str]:
    """Health probe for the worker process."""
    logger.info("ARQ ping ok ctx_keys=%s", list(ctx.keys()))
    return {"status": "ok"}


async def generate_report_job(
    ctx: dict[str, Any],
    user_id: str,
    survey_id: str,
    audience: str = "internal",
    title: str | None = None,
) -> dict[str, Any]:
    """Run grounded report generation off the request path."""
    from app.db.session import AsyncSessionLocal
    from app.repositories.survey import SurveyRepository
    from app.repositories.user import UserRepository
    from app.schemas.report import ReportCreateRequest
    from app.services.notification import NotificationService
    from app.services.report import ReportService

    logger.info(
        "generate_report_job start user=%s survey=%s audience=%s",
        user_id,
        survey_id,
        audience,
    )
    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_id(UUID(user_id))
        if user is None or not user.is_active:
            raise RuntimeError("User not found or inactive")
        try:
            body = ReportCreateRequest(audience=audience, title=title)  # type: ignore[arg-type]
            report = await ReportService(session).create_report(
                user=user,
                survey_id=UUID(survey_id),
                body=body,
            )
            payload = report.model_dump(mode="json")
            logger.info("generate_report_job done report_id=%s", payload.get("id"))
            return payload
        except Exception as exc:
            # create_report already notifies on success; notify failure here
            # when the job itself blows up before/without that path.
            if user.organization_id is not None:
                survey = await SurveyRepository(session).get_for_org_meta(
                    survey_id=UUID(survey_id),
                    organization_id=user.organization_id,
                )
                survey_title = survey.title if survey is not None else "Survey"
                try:
                    await NotificationService(session).notify_report_failed(
                        organization_id=user.organization_id,
                        survey_id=UUID(survey_id),
                        survey_title=survey_title,
                        detail=str(exc),
                    )
                except Exception:
                    logger.exception(
                        "report_failed notification failed survey=%s", survey_id
                    )
            raise


async def export_report_job(
    ctx: dict[str, Any],
    user_id: str,
    report_id: str,
    export_type: str = "pdf",
) -> dict[str, Any]:
    """Render PDF/DOCX/markdown export off the request path when queued."""
    from app.db.session import AsyncSessionLocal
    from app.repositories.user import UserRepository
    from app.schemas.report import ExportRequest
    from app.services.report import ReportService

    logger.info(
        "export_report_job start user=%s report=%s type=%s",
        user_id,
        report_id,
        export_type,
    )
    async with AsyncSessionLocal() as session:
        user = await UserRepository(session).get_by_id(UUID(user_id))
        if user is None or not user.is_active:
            raise RuntimeError("User not found or inactive")
        body = ExportRequest(type=export_type)  # type: ignore[arg-type]
        result = await ReportService(session).export_report(
            user=user,
            report_id=UUID(report_id),
            body=body,
        )
        payload = result.model_dump(mode="json")
        logger.info("export_report_job done export_id=%s", payload.get("id"))
        return payload
