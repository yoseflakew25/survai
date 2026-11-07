"""Org assistant — threads + RAG retrieve + structured tool fetches."""

from __future__ import annotations

import asyncio
import logging
import re
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import call_structured
from app.ai.prompts import assistant_v1
from app.ai.prompts.assistant_v1 import (
    AssistantAnswerOutput,
    AssistantPlanOutput,
)
from app.core.exceptions import BadRequestError, ForbiddenError, NotFoundError
from app.models.assistant import (
    AssistantMessage,
    AssistantMessageRole,
    AssistantThread,
)
from app.models.user import User
from app.repositories.assistant import (
    AssistantMessageRepository,
    AssistantThreadRepository,
)
from app.repositories.report import ReportRepository, SavedAnalysisRepository
from app.repositories.survey import SurveyRepository
from app.schemas.assistant import (
    AssistantMessageListResponse,
    AssistantMessagePublic,
    AssistantSendResponse,
    AssistantThreadListResponse,
    AssistantThreadPublic,
    AssistantThreadUpdate,
    KnowledgeReindexResponse,
)
from app.services.analytics import AnalyticsService
from app.services.knowledge_index import KnowledgeIndexService

logger = logging.getLogger(__name__)

_TITLE_MAX = 80
_DELTA_CHUNK = 28


def _require_org(user: User) -> UUID:
    if user.organization_id is None:
        raise ForbiddenError("Organization account required")
    return user.organization_id


def _thread_public(row: AssistantThread) -> AssistantThreadPublic:
    return AssistantThreadPublic.model_validate(row)


def _message_public(row: AssistantMessage) -> AssistantMessagePublic:
    return AssistantMessagePublic(
        id=row.id,
        role=row.role,  # type: ignore[arg-type]
        content=row.content,
        citations=row.citations if isinstance(row.citations, list) else None,
        tool_trace=row.tool_trace,
        created_at=row.created_at,
    )


def _title_from_question(question: str) -> str:
    cleaned = re.sub(r"\s+", " ", question.strip())
    if len(cleaned) <= _TITLE_MAX:
        return cleaned or "New chat"
    return cleaned[: _TITLE_MAX - 1].rstrip() + "…"


class AssistantService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.threads = AssistantThreadRepository(session)
        self.messages = AssistantMessageRepository(session)
        self.surveys = SurveyRepository(session)
        self.reports = ReportRepository(session)
        self.saved = SavedAnalysisRepository(session)
        self.analytics = AnalyticsService(session)
        self.knowledge = KnowledgeIndexService(session)

    async def list_threads(self, *, user: User) -> AssistantThreadListResponse:
        org_id = _require_org(user)
        rows = await self.threads.list_for_user(
            user_id=user.id, organization_id=org_id
        )
        return AssistantThreadListResponse(
            threads=[_thread_public(r) for r in rows],
            total=len(rows),
        )

    async def create_thread(
        self, *, user: User, title: str | None = None
    ) -> AssistantThreadPublic:
        org_id = _require_org(user)
        row = AssistantThread(
            organization_id=org_id,
            user_id=user.id,
            title=(title or "New chat").strip()[:255] or "New chat",
        )
        self.session.add(row)
        await self.session.commit()
        await self.session.refresh(row)
        return _thread_public(row)

    async def get_thread(
        self, *, user: User, thread_id: UUID
    ) -> AssistantThreadPublic:
        org_id = _require_org(user)
        row = await self.threads.get_for_user(
            thread_id=thread_id, user_id=user.id, organization_id=org_id
        )
        if row is None:
            raise NotFoundError("Thread not found")
        return _thread_public(row)

    async def update_thread(
        self, *, user: User, thread_id: UUID, body: AssistantThreadUpdate
    ) -> AssistantThreadPublic:
        org_id = _require_org(user)
        row = await self.threads.get_for_user(
            thread_id=thread_id, user_id=user.id, organization_id=org_id
        )
        if row is None:
            raise NotFoundError("Thread not found")
        row.title = body.title.strip()[:255]
        row.updated_at = datetime.now(UTC)
        await self.session.commit()
        await self.session.refresh(row)
        return _thread_public(row)

    async def delete_thread(self, *, user: User, thread_id: UUID) -> None:
        org_id = _require_org(user)
        row = await self.threads.get_for_user(
            thread_id=thread_id, user_id=user.id, organization_id=org_id
        )
        if row is None:
            raise NotFoundError("Thread not found")
        await self.session.delete(row)
        await self.session.commit()

    async def list_messages(
        self, *, user: User, thread_id: UUID
    ) -> AssistantMessageListResponse:
        org_id = _require_org(user)
        thread = await self.threads.get_for_user(
            thread_id=thread_id, user_id=user.id, organization_id=org_id
        )
        if thread is None:
            raise NotFoundError("Thread not found")
        rows = await self.messages.list_for_thread(thread_id=thread.id)
        return AssistantMessageListResponse(
            messages=[_message_public(m) for m in rows]
        )

    async def send_message(
        self, *, user: User, thread_id: UUID, content: str
    ) -> AssistantSendResponse:
        result: AssistantSendResponse | None = None
        async for event, payload in self.iter_send_message(
            user=user, thread_id=thread_id, content=content, stream_deltas=False
        ):
            if event == "done":
                assert isinstance(payload, AssistantSendResponse)
                result = payload
        if result is None:
            raise BadRequestError("Assistant could not complete the reply")
        return result

    async def iter_send_message(
        self,
        *,
        user: User,
        thread_id: UUID,
        content: str,
        stream_deltas: bool = True,
    ) -> AsyncIterator[tuple[str, Any]]:
        """Yield (event, payload) for SSE or a single done event for JSON send.

        Events: status → optional delta chunks → done (AssistantSendResponse).
        Structured Gemini calls stay non-streaming; deltas are progressive UI only.
        """
        org_id = _require_org(user)
        question = content.strip()
        if not question:
            raise BadRequestError("Message cannot be empty")

        thread = await self.threads.get_for_user(
            thread_id=thread_id, user_id=user.id, organization_id=org_id
        )
        if thread is None:
            raise NotFoundError("Thread not found")

        yield ("status", {"stage": "saving"})

        prior = await self.messages.list_for_thread(thread_id=thread.id)
        if not prior and thread.title == "New chat":
            thread.title = _title_from_question(question)

        user_msg = AssistantMessage(
            thread_id=thread.id,
            role=AssistantMessageRole.user.value,
            content=question,
        )
        self.session.add(user_msg)
        await self.session.flush()

        history = [
            {"role": m.role, "content": m.content[:400]}
            for m in prior[-6:]
        ]

        yield ("status", {"stage": "retrieving"})
        retrieved = await self.knowledge.retrieve(
            organization_id=org_id, query=question, top_k=6
        )
        chunk_payload = [
            {
                "id": str(chunk.id),
                "source_type": chunk.source_type,
                "source_id": str(chunk.source_id),
                "survey_id": str(chunk.survey_id) if chunk.survey_id else None,
                "title": chunk.title,
                "body": chunk.body[:1200],
                "score": round(score, 4),
            }
            for chunk, score in retrieved
        ]

        surveys = await self.surveys.list_for_org(
            organization_id=org_id,
            require_plan=False,
            with_tree=False,
            limit=100,
        )
        counts = await self.surveys.completed_response_counts(
            survey_ids=[s.id for s in surveys]
        )
        catalog = [
            {
                "id": str(s.id),
                "title": s.title,
                "status": s.status,
                "responses": counts.get(s.id, 0),
            }
            for s in surveys
        ]

        yield ("status", {"stage": "planning"})
        plan_call = await call_structured(
            feature="assistant_plan",
            system=assistant_v1.SYSTEM_PLAN,
            user=assistant_v1.build_plan_user_prompt(
                question=question,
                chunks=chunk_payload,
                surveys=catalog,
                history=history,
            ),
            schema=AssistantPlanOutput,
            user_id=user.id,
            session=self.session,
            input_meta={"thread_id": str(thread.id), "org_id": str(org_id)},
        )
        plan = plan_call.value
        assert isinstance(plan, AssistantPlanOutput)

        yield ("status", {"stage": "tools"})
        tool_payload, tool_trace = await self._run_tools(
            user=user,
            org_id=org_id,
            plan=plan,
            survey_catalog=catalog,
            retrieved_survey_ids=[
                c["survey_id"]
                for c in chunk_payload
                if c.get("survey_id")
            ],
        )

        yield ("status", {"stage": "answering"})
        answer_call = await call_structured(
            feature="assistant_answer",
            system=assistant_v1.SYSTEM_ANSWER,
            user=assistant_v1.build_answer_user_prompt(
                question=question,
                chunks=chunk_payload,
                tool_payload=tool_payload,
                history=history,
            ),
            schema=AssistantAnswerOutput,
            user_id=user.id,
            session=self.session,
            input_meta={"thread_id": str(thread.id), "org_id": str(org_id)},
        )
        answer = answer_call.value
        assert isinstance(answer, AssistantAnswerOutput)

        reply = (
            answer.answer.strip()
            or "I could not find enough grounded data to answer that."
        )
        if stream_deltas and reply:
            for i in range(0, len(reply), _DELTA_CHUNK):
                yield ("delta", {"text": reply[i : i + _DELTA_CHUNK]})
                await asyncio.sleep(0)

        citations = self._build_citations(
            answer=answer, chunks=chunk_payload, tool_trace=tool_trace
        )
        assistant_msg = AssistantMessage(
            thread_id=thread.id,
            role=AssistantMessageRole.assistant.value,
            content=reply,
            citations=citations,
            tool_trace=tool_trace,
        )
        self.session.add(assistant_msg)
        thread.updated_at = datetime.now(UTC)
        await self.session.commit()

        rows = await self.messages.list_for_thread(thread_id=thread.id)
        await self.session.refresh(thread)
        yield (
            "done",
            AssistantSendResponse(
                thread=_thread_public(thread),
                messages=[_message_public(m) for m in rows],
            ),
        )

    async def reindex_org(self, *, user: User) -> KnowledgeReindexResponse:
        org_id = _require_org(user)
        stats = await self.knowledge.reindex_organization(organization_id=org_id)
        return KnowledgeReindexResponse(**stats)

    async def _run_tools(
        self,
        *,
        user: User,
        org_id: UUID,
        plan: AssistantPlanOutput,
        survey_catalog: list[dict[str, Any]],
        retrieved_survey_ids: list[str],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        trace: list[dict[str, Any]] = [
            {"tool": "list_surveys", "ok": True, "count": len(survey_catalog)}
        ]
        analytics_out: list[dict[str, Any]] = []
        saved_views_out: list[dict[str, Any]] = []
        reports_out: list[dict[str, Any]] = []

        survey_ids: list[UUID] = []
        for raw in [*plan.survey_ids_for_analytics, *retrieved_survey_ids]:
            try:
                sid = UUID(str(raw))
            except ValueError:
                continue
            if sid not in survey_ids:
                survey_ids.append(sid)
        survey_ids = survey_ids[:3]

        saved_view_survey_ids: list[UUID] = []
        for raw in [
            *plan.survey_ids_for_saved_views,
            *plan.survey_ids_for_analytics,
            *retrieved_survey_ids,
        ]:
            try:
                sid = UUID(str(raw))
            except ValueError:
                continue
            if sid not in saved_view_survey_ids:
                saved_view_survey_ids.append(sid)
        saved_view_survey_ids = saved_view_survey_ids[:3]

        for sid in survey_ids:
            survey = await self.surveys.get_for_org_meta(
                survey_id=sid, organization_id=org_id
            )
            if survey is None:
                continue
            try:
                summary = await self.analytics.summary(user=user, survey_id=sid)
                analytics_out.append(
                    {
                        "survey_id": str(sid),
                        "title": survey.title,
                        "response_count": summary.response_count,
                        "completion_rate": summary.completion_rate,
                        "metrics": [
                            m.model_dump() for m in (summary.metrics or [])[:20]
                        ],
                    }
                )
                trace.append(
                    {
                        "tool": "get_survey_analytics_summary",
                        "survey_id": str(sid),
                        "ok": True,
                    }
                )
            except Exception as exc:
                trace.append(
                    {
                        "tool": "get_survey_analytics_summary",
                        "survey_id": str(sid),
                        "ok": False,
                        "error": str(exc)[:200],
                    }
                )

        for sid in saved_view_survey_ids:
            survey = await self.surveys.get_for_org_meta(
                survey_id=sid, organization_id=org_id
            )
            if survey is None:
                continue
            try:
                rows = await self.saved.list_for_survey(survey_id=sid)
                views = [
                    {
                        "id": str(row.id),
                        "name": row.name,
                        "filter_count": len(row.filters or []),
                        "filters": list(row.filters or [])[:12],
                        "chart_config": row.chart_config
                        if isinstance(row.chart_config, dict)
                        else None,
                    }
                    for row in rows[:12]
                ]
                saved_views_out.append(
                    {
                        "survey_id": str(sid),
                        "title": survey.title,
                        "views": views,
                    }
                )
                trace.append(
                    {
                        "tool": "list_saved_views",
                        "survey_id": str(sid),
                        "ok": True,
                        "count": len(views),
                    }
                )
            except Exception as exc:
                trace.append(
                    {
                        "tool": "list_saved_views",
                        "survey_id": str(sid),
                        "ok": False,
                        "error": str(exc)[:200],
                    }
                )

        report_ids: list[UUID] = []
        for raw in plan.report_ids_to_open:
            try:
                rid = UUID(str(raw))
            except ValueError:
                continue
            if rid not in report_ids:
                report_ids.append(rid)

        # Also open latest report for analytics surveys when planner omitted ids.
        if not report_ids:
            for sid in survey_ids[:2]:
                latest = await self.reports.latest_for_survey(survey_id=sid)
                if latest is not None:
                    report_ids.append(latest.id)
        report_ids = report_ids[:3]

        for rid in report_ids:
            report = await self.reports.get_for_org(
                report_id=rid, organization_id=org_id
            )
            if report is None:
                continue
            snap = report.metrics_snapshot if isinstance(report.metrics_snapshot, dict) else {}
            sections = []
            for sec in (report.sections or [])[:8]:
                if not isinstance(sec, dict):
                    continue
                content = str(sec.get("content") or "")
                sections.append(
                    {
                        "id": sec.get("id"),
                        "title": sec.get("title"),
                        "content": content[:500],
                    }
                )
            reports_out.append(
                {
                    "report_id": str(report.id),
                    "survey_id": str(report.survey_id),
                    "title": report.title,
                    "sections": sections,
                    "snapshot_response_count": snap.get("response_count"),
                    "snapshot_metrics": (snap.get("metrics") or [])[:16],
                }
            )
            trace.append(
                {
                    "tool": "get_report",
                    "report_id": str(report.id),
                    "ok": True,
                }
            )

        payload = {
            "list_surveys": survey_catalog,
            "analytics_summaries": analytics_out,
            "saved_views": saved_views_out,
            "reports": reports_out,
        }
        return payload, trace

    @staticmethod
    def _build_citations(
        *,
        answer: AssistantAnswerOutput,
        chunks: list[dict[str, Any]],
        tool_trace: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        by_id = {c["id"]: c for c in chunks}
        out: list[dict[str, Any]] = []
        for cid in answer.citation_chunk_ids:
            chunk = by_id.get(str(cid))
            if chunk is None:
                continue
            href = None
            if chunk.get("survey_id"):
                if chunk.get("source_type") == "report":
                    href = f"/dashboard/surveys/{chunk['survey_id']}/reports"
                elif chunk.get("source_type") == "review":
                    href = f"/dashboard/surveys/{chunk['survey_id']}/review"
                else:
                    href = f"/dashboard/surveys/{chunk['survey_id']}/plan"
            out.append(
                {
                    "chunk_id": chunk["id"],
                    "source_type": chunk["source_type"],
                    "source_id": chunk["source_id"],
                    "survey_id": chunk.get("survey_id"),
                    "title": chunk["title"],
                    "href": href,
                }
            )
        if not out and chunks:
            # Fallback: top retrieved chunk
            top = chunks[0]
            out.append(
                {
                    "chunk_id": top["id"],
                    "source_type": top["source_type"],
                    "source_id": top["source_id"],
                    "survey_id": top.get("survey_id"),
                    "title": top["title"],
                    "href": (
                        f"/dashboard/surveys/{top['survey_id']}/plan"
                        if top.get("survey_id")
                        else None
                    ),
                }
            )
        if answer.metric_refs:
            out.append(
                {
                    "chunk_id": None,
                    "source_type": "metrics",
                    "title": "Metrics",
                    "metric_refs": list(answer.metric_refs)[:12],
                    "tools": [t.get("tool") for t in tool_trace if t.get("ok")],
                }
            )
        return out
