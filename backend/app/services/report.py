"""Report generation, chat, export, saved analyses."""

from __future__ import annotations

import base64
import csv
import io
import logging
import re
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.reconciliation import (
    reconcile_chat,
    reconcile_report,
    strip_ungrounded_statements,
    ungrounded_numbers_in_text,
)
from app.ai.schemas import ReportGenerationOutput, ReportSectionAI
from app.ai.services.report import answer_report_chat, generate_report
from app.analytics.engine import (
    distribution_question_ids,
    percent_distribution,
)
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.report import (
    ExportRecord,
    Report,
    ReportChatMessage,
    ReportStatus,
    SavedAnalysis,
)
from app.models.user import User
from app.repositories.report import (
    ExportRepository,
    ReportChatRepository,
    ReportRepository,
    SavedAnalysisRepository,
)
from app.repositories.survey import SurveyRepository
from app.schemas.report import (
    ExportPublic,
    ExportRequest,
    ReportChatMessagePublic,
    ReportChatRequest,
    ReportChatResponse,
    ReportCreateRequest,
    ReportIntegrityPublic,
    ReportPublic,
    ReportSectionPublic,
    ReportStatsPublic,
    ReportUpdateRequest,
    SavedAnalysisCreate,
    SavedAnalysisPublic,
)
from app.services.analytics import AnalyticsService
from app.services.report_docx import build_report_docx
from app.services.report_pdf import build_report_pdf

logger = logging.getLogger(__name__)

_SAFE_FILENAME = re.compile(r"[^\w\-]+")

_SECTION_ORDER = [
    ("executive_summary", "Executive Summary"),
    ("methodology", "Methodology"),
    ("respondent_profile", "Respondent Profile"),
    ("key_findings", "Key Findings"),
    ("detailed_analysis", "Detailed Analysis"),
    ("cross_cutting_insights", "Cross-Cutting Insights"),
    ("limitations", "Limitations"),
    ("recommendations", "Recommendations"),
    ("implications_and_next_steps", "Implications and Next Steps"),
    ("conclusion", "Conclusion"),
]


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


def _section_to_public(key: str, title: str, sec: ReportSectionAI) -> ReportSectionPublic:
    lines = [s.text.strip() for s in (sec.statements or []) if s.text.strip()]
    refs = [
        s.metric_ref.strip()
        for s in (sec.statements or [])
        if (s.metric_ref or "").strip()
    ]
    return ReportSectionPublic(
        id=key,
        title=sec.heading.strip() or title,
        content="\n\n".join(lines),
        metric_refs=list(dict.fromkeys(refs)),
    )


def _output_to_sections(output: ReportGenerationOutput) -> list[dict[str, Any]]:
    mapping = {
        key: getattr(output, key)
        for key, _ in _SECTION_ORDER
        if hasattr(output, key)
    }
    out: list[dict[str, Any]] = []
    for key, default_title in _SECTION_ORDER:
        sec = mapping.get(key)
        if sec is None:
            continue
        pub = _section_to_public(key, default_title, sec)
        out.append(pub.model_dump())
    return out


class ReportService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.surveys = SurveyRepository(session)
        self.reports = ReportRepository(session)
        self.chats = ReportChatRepository(session)
        self.exports = ExportRepository(session)
        self.saved = SavedAnalysisRepository(session)
        self.analytics = AnalyticsService(session)

    async def get_latest(
        self, *, user: User, survey_id: UUID
    ) -> ReportPublic | None:
        survey = await self._owned_survey(user, survey_id)
        if survey.current_version_id is None:
            return None
        # Same scope as analytics/respondents — current published version only.
        report = await self.reports.latest_for_version(
            survey_id=survey.id,
            survey_version_id=survey.current_version_id,
        )
        if report is None:
            return None
        return await self._to_public_with_integrity(
            report, survey_title=survey.title, survey=survey, user=user
        )

    async def create_report(
        self, *, user: User, survey_id: UUID, body: ReportCreateRequest
    ) -> ReportPublic:
        survey = await self._owned_survey(user, survey_id)
        if survey.current_version_id is None:
            raise BadRequestError("Publish the survey and collect responses first.")

        snapshot = await self._build_metrics_snapshot(user=user, survey_id=survey.id)
        snap_version = UUID(str(snapshot["survey_version_id"]))
        if snap_version != survey.current_version_id:
            raise BadRequestError(
                "Analytics snapshot version does not match the survey's "
                "current published version."
            )
        if int(snapshot.get("response_count") or 0) < 1:
            raise BadRequestError(
                "Need at least one completed response before generating a report."
            )

        audience = body.audience
        title = (body.title or f"{survey.title} — Report").strip()

        call = await generate_report(
            survey_title=survey.title,
            audience=audience,
            snapshot=snapshot,
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, ReportGenerationOutput)

        metrics = list(snapshot.get("metrics") or [])
        violations = reconcile_report(output, metrics)
        if violations:
            logger.warning("Report reconciliation violations: %s", violations[:5])
            # One retry with feedback is handled loosely by stripping ungrounded
            # claims rather than a second full Gemini call (keeps latency bounded).
            output = strip_ungrounded_statements(output, metrics)

        sections = _output_to_sections(output)
        # Freeze snapshot at generation — never mutate later (§9).
        report = Report(
            survey_id=survey.id,
            survey_version_id=survey.current_version_id,
            created_by=user.id,
            title=title,
            audience=audience,
            status=ReportStatus.draft.value,
            sections=sections,
            metrics_snapshot=snapshot,
            ai_generation_meta={
                "model": call.model,
                "prompt_version": call.prompt_version,
                "request_id": call.request_id,
                "latency_ms": call.latency_ms,
                "reconciliation_stripped": bool(violations),
                "survey_version_id": str(survey.current_version_id),
            },
        )
        self.session.add(report)
        await self.session.commit()
        await self.session.refresh(report)
        return await self._to_public_with_integrity(
            report, survey_title=survey.title, survey=survey, user=user
        )

    async def update_report(
        self, *, user: User, report_id: UUID, body: ReportUpdateRequest
    ) -> ReportPublic:
        org_id = _require_org(user)
        report = await self.reports.get_for_org(
            report_id=report_id, organization_id=org_id
        )
        if report is None:
            raise NotFoundError("Report not found")
        survey = await self.surveys.get_for_org_meta(
            survey_id=report.survey_id, organization_id=org_id
        )
        assert survey is not None

        data = body.model_dump(exclude_unset=True)
        if "title" in data and data["title"] is not None:
            report.title = data["title"].strip()
        if "status" in data and data["status"] is not None:
            report.status = data["status"]
        if "sections" in data and data["sections"] is not None:
            metrics = list((report.metrics_snapshot or {}).get("metrics") or [])
            for sec in body.sections or []:
                bad = ungrounded_numbers_in_text(sec.content, metrics)
                if bad:
                    raise BadRequestError(
                        "Edited text includes numbers that are not in this "
                        f"report's metrics snapshot ({', '.join(bad[:8])}). "
                        "Remove them or regenerate from analytics."
                    )
            # Preserve frozen metrics_snapshot — edits may change prose only.
            report.sections = [s.model_dump() for s in body.sections or []]
        await self.session.commit()
        await self.session.refresh(report)
        return await self._to_public_with_integrity(
            report, survey_title=survey.title, survey=survey, user=user
        )

    async def regenerate_section(
        self, *, user: User, report_id: UUID, section_id: str
    ) -> ReportPublic:
        """Re-run full report generation but keep same metrics_snapshot (§9)."""
        org_id = _require_org(user)
        report = await self.reports.get_for_org(
            report_id=report_id, organization_id=org_id
        )
        if report is None:
            raise NotFoundError("Report not found")
        survey = await self.surveys.get_for_org(
            survey_id=report.survey_id, organization_id=org_id
        )
        assert survey is not None

        valid_ids = {k for k, _ in _SECTION_ORDER}
        if section_id not in valid_ids:
            raise BadRequestError(f"Unknown section_id: {section_id}")

        snapshot = report.metrics_snapshot or {}
        call = await generate_report(
            survey_title=survey.title,
            audience=report.audience,
            snapshot=snapshot,
            user_id=user.id,
            session=self.session,
        )
        output = call.value
        assert isinstance(output, ReportGenerationOutput)
        metrics = list(snapshot.get("metrics") or [])
        if reconcile_report(output, metrics):
            output = strip_ungrounded_statements(output, metrics)

        new_sections = _output_to_sections(output)
        by_id = {s["id"]: s for s in new_sections}
        updated = []
        for sec in report.sections or []:
            sid = str(sec.get("id") or "")
            if sid == section_id and section_id in by_id:
                updated.append(by_id[section_id])
            else:
                updated.append(sec)
        report.sections = updated
        meta = dict(report.ai_generation_meta or {})
        meta["last_section_regen"] = {
            "section_id": section_id,
            "model": call.model,
            "request_id": call.request_id,
        }
        report.ai_generation_meta = meta
        # metrics_snapshot intentionally unchanged — §9 / RPT-05.
        await self.session.commit()
        await self.session.refresh(report)
        return await self._to_public_with_integrity(
            report, survey_title=survey.title, survey=survey, user=user
        )

    async def chat(
        self, *, user: User, report_id: UUID, body: ReportChatRequest
    ) -> ReportChatResponse:
        org_id = _require_org(user)
        report = await self.reports.get_for_org(
            report_id=report_id, organization_id=org_id
        )
        if report is None:
            raise NotFoundError("Report not found")

        question = body.message.strip()
        if not question:
            raise BadRequestError("Message cannot be empty.")

        # Prior turns for multi-turn context (before appending this user message).
        prior = await self.chats.list_for_report(report_id=report.id)
        history = [
            {"role": m.role, "content": m.content}
            for m in prior
            if m.content
        ]

        user_msg = ReportChatMessage(
            report_id=report.id,
            role="user",
            content=question,
            created_by=user.id,
        )
        self.session.add(user_msg)
        await self.session.flush()

        call = await answer_report_chat(
            question=question,
            sections=list(report.sections or []),
            snapshot=report.metrics_snapshot or {},
            history=history,
            user_id=user.id,
            session=self.session,
        )
        chat_out = call.value
        metrics = list((report.metrics_snapshot or {}).get("metrics") or [])
        violations = reconcile_chat(chat_out, metrics)
        answer = chat_out.answer
        confidence = chat_out.confidence
        refs = list(chat_out.metric_refs or [])
        if violations:
            logger.warning(
                "Chat reconciliation violations report_id=%s: %s",
                report.id,
                violations,
            )
            answer = (
                "I could not ground that answer fully in the stored metrics. "
                "Please rephrase, or ask about a specific metric key from the report."
            )
            confidence = "insufficient_data"
            refs = []

        assistant = ReportChatMessage(
            report_id=report.id,
            role="assistant",
            content=answer,
            metric_refs=refs,
            confidence=confidence,
            created_by=user.id,
        )
        self.session.add(assistant)
        await self.session.commit()

        # Avoid a second full-history query — stitch from what we already have.
        return ReportChatResponse(
            messages=[
                *[self._chat_public(m) for m in prior],
                self._chat_public(user_msg),
                self._chat_public(assistant),
            ]
        )

    async def chat_history(
        self, *, user: User, report_id: UUID
    ) -> ReportChatResponse:
        org_id = _require_org(user)
        report = await self.reports.get_for_org(
            report_id=report_id, organization_id=org_id
        )
        if report is None:
            raise NotFoundError("Report not found")
        messages = await self.chats.list_for_report(report_id=report.id)
        return ReportChatResponse(
            messages=[self._chat_public(m) for m in messages]
        )

    async def export_report(
        self, *, user: User, report_id: UUID, body: ExportRequest
    ) -> ExportPublic:
        org_id = _require_org(user)
        report = await self.reports.get_for_org(
            report_id=report_id, organization_id=org_id
        )
        if report is None:
            raise NotFoundError("Report not found")
        survey = await self.surveys.get_for_org_meta(
            survey_id=report.survey_id, organization_id=org_id
        )
        survey_title = survey.title if survey is not None else "Survey"

        md = self._report_markdown(report)
        safe_name = _SAFE_FILENAME.sub("_", (report.title or "report")).strip("_")[
            :60
        ] or "report"
        content_b64: str | None = None
        filename: str | None = None
        mime: str | None = None
        content_text: str | None = md

        generated_label = (
            report.created_at.strftime("%d %b %Y") if report.created_at else None
        )
        sections = list(report.sections or [])

        if body.type == "pdf":
            pdf_bytes = build_report_pdf(
                title=report.title,
                survey_title=survey_title,
                sections=sections,
                generated_label=generated_label,
            )
            content_b64 = base64.b64encode(pdf_bytes).decode("ascii")
            filename = f"{safe_name}.pdf"
            mime = "application/pdf"
            # Keep a short note in content_text for audit; binary lives in base64.
            content_text = f"PDF export ({len(pdf_bytes)} bytes)"
        elif body.type == "docx":
            docx_bytes = build_report_docx(
                title=report.title,
                survey_title=survey_title,
                sections=sections,
                generated_label=generated_label,
            )
            content_b64 = base64.b64encode(docx_bytes).decode("ascii")
            filename = f"{safe_name}.docx"
            mime = (
                "application/vnd.openxmlformats-officedocument."
                "wordprocessingml.document"
            )
            content_text = f"DOCX export ({len(docx_bytes)} bytes)"
        else:
            filename = f"{safe_name}.md"
            mime = "text/markdown;charset=utf-8"

        export = ExportRecord(
            report_id=report.id,
            survey_id=report.survey_id,
            type=body.type,
            status="completed",
            content_text=content_text,
            requested_by=user.id,
            completed_at=datetime.now(UTC),
        )
        self.session.add(export)
        await self.session.commit()
        await self.session.refresh(export)
        return ExportPublic(
            id=export.id,
            type=export.type,  # type: ignore[arg-type]
            status=export.status,
            content_text=export.content_text,
            content_base64=content_b64,
            filename=filename,
            mime_type=mime,
            file_url=export.file_url,
            created_at=export.created_at,
        )

    async def export_analytics_csv(
        self, *, user: User, survey_id: UUID
    ) -> ExportPublic:
        survey = await self._owned_survey(user, survey_id)
        if survey.current_version_id is None:
            raise BadRequestError("Publish the survey before exporting analytics.")

        frame = await self.analytics._load_frame(  # noqa: SLF001
            user=user, survey_id=survey.id, filters=[]
        )
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            ["question_id", "question_text", "question_type", "label", "count", "percent"]
        )
        qids = distribution_question_ids(frame.questions, only=None)
        for qid in qids:
            dist = percent_distribution(frame, qid)
            for b in dist.buckets:
                writer.writerow(
                    [
                        str(dist.question_id),
                        dist.question_text,
                        dist.question_type,
                        b.label,
                        b.value,
                        b.percent,
                    ]
                )
        export = ExportRecord(
            survey_id=survey.id,
            type="csv",
            status="completed",
            content_text=buf.getvalue(),
            requested_by=user.id,
            completed_at=datetime.now(UTC),
        )
        self.session.add(export)
        await self.session.commit()
        await self.session.refresh(export)
        return ExportPublic(
            id=export.id,
            type="csv",
            status=export.status,
            content_text=export.content_text,
            file_url=None,
            created_at=export.created_at,
        )

    async def list_saved_analyses(
        self, *, user: User, survey_id: UUID
    ) -> list[SavedAnalysisPublic]:
        survey = await self._owned_survey(user, survey_id)
        rows = await self.saved.list_for_survey(survey_id=survey.id)
        return [
            SavedAnalysisPublic(
                id=r.id,
                survey_id=r.survey_id,
                name=r.name,
                filters=list(r.filters or []),
                created_at=r.created_at,
            )
            for r in rows
        ]

    async def create_saved_analysis(
        self, *, user: User, survey_id: UUID, body: SavedAnalysisCreate
    ) -> SavedAnalysisPublic:
        survey = await self._owned_survey(user, survey_id)
        row = SavedAnalysis(
            survey_id=survey.id,
            created_by=user.id,
            name=body.name.strip(),
            filters=body.filters,
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return SavedAnalysisPublic(
            id=row.id,
            survey_id=row.survey_id,
            name=row.name,
            filters=list(row.filters or []),
            created_at=row.created_at,
        )

    async def _build_metrics_snapshot(
        self, *, user: User, survey_id: UUID
    ) -> dict[str, Any]:
        summary = await self.analytics.summary(user=user, survey_id=survey_id)
        frame = await self.analytics._load_frame(  # noqa: SLF001
            user=user, survey_id=survey_id, filters=[]
        )
        qids = distribution_question_ids(frame.questions, only=None)
        distributions = []
        for qid in qids[:20]:
            dist = percent_distribution(frame, qid)
            distributions.append(
                {
                    "question_id": str(dist.question_id),
                    "question_text": dist.question_text,
                    "question_type": dist.question_type,
                    "total_responses": dist.total_responses,
                    "buckets": [
                        {"label": b.label, "value": b.value, "percent": b.percent}
                        for b in dist.buckets
                    ],
                }
            )
            # Promote top bucket percents into flat metrics for grounding
        metrics = [m.model_dump() for m in summary.metrics]
        for dist in distributions:
            for i, b in enumerate(dist["buckets"][:6]):
                key = f"q_{dist['question_id'][:8]}_b{i}"
                metrics.append(
                    {
                        "key": key,
                        "label": f"{dist['question_text'][:80]} — {b['label']}",
                        "value": b["percent"],
                        "unit": "percent",
                    }
                )
                metrics.append(
                    {
                        "key": f"{key}_count",
                        "label": f"{dist['question_text'][:80]} — {b['label']} (n)",
                        "value": b["value"],
                        "unit": "count",
                    }
                )

        return {
            "survey_id": str(summary.survey_id),
            "survey_version_id": str(summary.survey_version_id),
            "generated_at": datetime.now(UTC).isoformat(),
            "response_count": summary.response_count,
            "completion_rate": summary.completion_rate,
            "avg_completion_minutes": summary.avg_completion_minutes,
            "metrics": metrics,
            "distributions": distributions,
            "qualitative_excerpts": [],
        }

    async def _owned_survey(self, user: User, survey_id: UUID):
        org_id = _require_org(user)
        survey = await self.surveys.get_for_org(
            survey_id=survey_id, organization_id=org_id
        )
        if survey is None:
            # meta-only fallback for title when tree not needed
            survey = await self.surveys.get_for_org_meta(
                survey_id=survey_id, organization_id=org_id
            )
        if survey is None:
            raise NotFoundError("Survey not found")
        return survey

    async def _to_public_with_integrity(
        self,
        report: Report,
        *,
        survey_title: str,
        survey: Any,
        user: User,
    ) -> ReportPublic:
        snap = report.metrics_snapshot or {}
        meta = report.ai_generation_meta or {}
        sections = [
            ReportSectionPublic(
                id=str(s.get("id") or ""),
                title=str(s.get("title") or ""),
                content=str(s.get("content") or ""),
                metric_refs=list(s.get("metric_refs") or []),
            )
            for s in (report.sections or [])
        ]
        q_count = len(snap.get("distributions") or [])
        snapshot_n = int(snap.get("response_count") or 0)
        current_vid = getattr(survey, "current_version_id", None)
        matches_current = (
            current_vid is not None and report.survey_version_id == current_vid
        )

        live_n: int | None = None
        is_stale = False
        if matches_current and current_vid is not None:
            try:
                summary = await self.analytics.summary(
                    user=user, survey_id=report.survey_id
                )
                live_n = summary.response_count
                is_stale = live_n != snapshot_n
            except Exception:
                logger.debug(
                    "Could not compute live response count for report integrity",
                    exc_info=True,
                )

        integrity = ReportIntegrityPublic(
            matches_current_version=matches_current,
            is_stale=is_stale,
            snapshot_response_count=snapshot_n,
            live_response_count=live_n,
            snapshot_survey_version_id=report.survey_version_id,
            current_survey_version_id=current_vid,
        )

        return ReportPublic(
            id=report.id,
            survey_id=report.survey_id,
            survey_version_id=report.survey_version_id,
            survey_title=survey_title,
            title=report.title,
            audience=report.audience,  # type: ignore[arg-type]
            status=report.status,  # type: ignore[arg-type]
            model=meta.get("model"),
            stats=ReportStatsPublic(
                response_count=snapshot_n,
                completion_rate=float(snap.get("completion_rate") or 0),
                avg_completion_minutes=snap.get("avg_completion_minutes"),
                questions_count=q_count,
            ),
            sections=sections,
            integrity=integrity,
            created_at=report.created_at,
            updated_at=report.updated_at,
        )

    @staticmethod
    def _chat_public(m: ReportChatMessage) -> ReportChatMessagePublic:
        return ReportChatMessagePublic(
            id=m.id,
            role=m.role,  # type: ignore[arg-type]
            content=m.content,
            metric_refs=list(m.metric_refs or []),
            confidence=m.confidence,  # type: ignore[arg-type]
            created_at=m.created_at,
        )

    @staticmethod
    def _report_markdown(report: Report) -> str:
        parts = [f"# {report.title}", ""]
        for sec in report.sections or []:
            parts.append(f"## {sec.get('title') or ''}")
            parts.append("")
            parts.append(str(sec.get("content") or ""))
            parts.append("")
        return "\n".join(parts).strip() + "\n"
