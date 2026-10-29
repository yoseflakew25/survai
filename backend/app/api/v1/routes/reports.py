"""Reports, chat, exports, saved analyses."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.deps import CurrentUser, ReportServiceDep
from app.jobs.queue import enqueue_job, jobs_enabled
from app.schemas.jobs import JobAccepted
from app.schemas.report import (
    ExportPublic,
    ExportRequest,
    ReportChatRequest,
    ReportChatResponse,
    ReportCreateRequest,
    ReportPublic,
    ReportSectionRegenerateRequest,
    ReportUpdateRequest,
    SavedAnalysisCreate,
    SavedAnalysisPublic,
)

router = APIRouter(tags=["reports"])


@router.get(
    "/surveys/{survey_id}/reports/latest",
    response_model=ReportPublic | None,
)
async def get_latest_report(
    survey_id: UUID,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ReportPublic | None:
    return await reports.get_latest(user=current_user, survey_id=survey_id)


@router.post(
    "/surveys/{survey_id}/reports",
    response_model=ReportPublic | JobAccepted,
    status_code=status.HTTP_201_CREATED,
    responses={202: {"model": JobAccepted}},
)
async def create_report(
    survey_id: UUID,
    body: ReportCreateRequest,
    current_user: CurrentUser,
    reports: ReportServiceDep,
    response: Response,
) -> ReportPublic | JobAccepted:
    """Generate a report. With REDIS_URL, returns 202 + job_id for the worker."""
    if jobs_enabled():
        job_id = await enqueue_job(
            "generate_report_job",
            str(current_user.id),
            str(survey_id),
            body.audience,
            body.title,
        )
        if job_id:
            response.status_code = status.HTTP_202_ACCEPTED
            return JobAccepted(
                job_id=job_id,
                poll_url=f"/api/v1/jobs/{job_id}",
            )
    return await reports.create_report(
        user=current_user, survey_id=survey_id, body=body
    )


@router.patch("/reports/{report_id}", response_model=ReportPublic)
async def update_report(
    report_id: UUID,
    body: ReportUpdateRequest,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ReportPublic:
    return await reports.update_report(
        user=current_user, report_id=report_id, body=body
    )


@router.post(
    "/reports/{report_id}/sections/regenerate",
    response_model=ReportPublic,
)
async def regenerate_section(
    report_id: UUID,
    body: ReportSectionRegenerateRequest,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ReportPublic:
    return await reports.regenerate_section(
        user=current_user,
        report_id=report_id,
        section_id=body.section_id,
    )


@router.get("/reports/{report_id}/chat", response_model=ReportChatResponse)
async def get_report_chat(
    report_id: UUID,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ReportChatResponse:
    return await reports.chat_history(user=current_user, report_id=report_id)


@router.post("/reports/{report_id}/chat", response_model=ReportChatResponse)
async def post_report_chat(
    report_id: UUID,
    body: ReportChatRequest,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ReportChatResponse:
    return await reports.chat(user=current_user, report_id=report_id, body=body)


@router.post(
    "/reports/{report_id}/export",
    response_model=ExportPublic,
    status_code=status.HTTP_201_CREATED,
)
async def export_report(
    report_id: UUID,
    body: ExportRequest,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ExportPublic:
    return await reports.export_report(
        user=current_user, report_id=report_id, body=body
    )


@router.post(
    "/surveys/{survey_id}/analytics/export",
    response_model=ExportPublic,
    status_code=status.HTTP_201_CREATED,
)
async def export_analytics_csv(
    survey_id: UUID,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> ExportPublic:
    return await reports.export_analytics_csv(
        user=current_user, survey_id=survey_id
    )


@router.get(
    "/surveys/{survey_id}/saved-analyses",
    response_model=list[SavedAnalysisPublic],
)
async def list_saved_analyses(
    survey_id: UUID,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> list[SavedAnalysisPublic]:
    return await reports.list_saved_analyses(
        user=current_user, survey_id=survey_id
    )


@router.post(
    "/surveys/{survey_id}/saved-analyses",
    response_model=SavedAnalysisPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_saved_analysis(
    survey_id: UUID,
    body: SavedAnalysisCreate,
    current_user: CurrentUser,
    reports: ReportServiceDep,
) -> SavedAnalysisPublic:
    return await reports.create_saved_analysis(
        user=current_user, survey_id=survey_id, body=body
    )
