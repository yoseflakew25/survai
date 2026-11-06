"""Org RAG knowledge index — embed + upsert survey/report/review chunks."""

from __future__ import annotations

import hashlib
import logging
import math
import re
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import embed_texts
from app.models.assistant import KnowledgeSourceType, OrgKnowledgeChunk
from app.models.reviewer import ReviewerReport
from app.models.survey import Survey
from app.repositories.assistant import KnowledgeChunkRepository
from app.repositories.report import ReportRepository
from app.repositories.reviewer import ReviewerReportRepository
from app.repositories.survey import SurveyRepository
from app.repositories.survey_plan import SurveyPlanRepository

logger = logging.getLogger(__name__)

_BODY_MAX = 4000


def _hash_text(title: str, body: str) -> str:
    return hashlib.sha256(f"{title}\n{body}".encode("utf-8")).hexdigest()


def _truncate(text: str, max_len: int = _BODY_MAX) -> str:
    text = re.sub(r"\s+", " ", (text or "").strip())
    if len(text) <= max_len:
        return text
    return text[: max_len - 1].rstrip() + "…"


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return -1.0
    dot = 0.0
    na = 0.0
    nb = 0.0
    for x, y in zip(a, b, strict=True):
        dot += x * y
        na += x * x
        nb += y * y
    if na <= 0.0 or nb <= 0.0:
        return -1.0
    return dot / (math.sqrt(na) * math.sqrt(nb))


class KnowledgeIndexService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.chunks = KnowledgeChunkRepository(session)
        self.surveys = SurveyRepository(session)
        self.plans = SurveyPlanRepository(session)
        self.reports = ReportRepository(session)
        self.reviewer_reports = ReviewerReportRepository(session)

    async def upsert_chunk(
        self,
        *,
        organization_id: UUID,
        source_type: KnowledgeSourceType | str,
        source_id: UUID,
        title: str,
        body: str,
        survey_id: UUID | None = None,
        embedding: list[float] | None = None,
    ) -> OrgKnowledgeChunk | None:
        source_value = (
            source_type.value
            if isinstance(source_type, KnowledgeSourceType)
            else str(source_type)
        )
        title = (title or "Untitled").strip()[:500]
        body = _truncate(body)
        if not body:
            return None
        content_hash = _hash_text(title, body)
        existing = await self.chunks.get_by_source(
            organization_id=organization_id,
            source_type=source_value,
            source_id=source_id,
        )
        if existing is not None and existing.content_hash == content_hash:
            return existing

        if embedding is None:
            vectors = await embed_texts(
                [f"{title}\n{body}"], task_type="RETRIEVAL_DOCUMENT"
            )
            if not vectors or not vectors[0]:
                logger.warning("Empty embedding for %s/%s", source_value, source_id)
                return None
            embedding = vectors[0]

        if existing is None:
            row = OrgKnowledgeChunk(
                organization_id=organization_id,
                source_type=source_value,
                source_id=source_id,
                survey_id=survey_id,
                title=title,
                body=body,
                embedding=embedding,
                content_hash=content_hash,
            )
            self.session.add(row)
            await self.session.flush()
            return row

        existing.title = title
        existing.body = body
        existing.embedding = embedding
        existing.content_hash = content_hash
        existing.survey_id = survey_id
        await self.session.flush()
        return existing

    async def retrieve(
        self,
        *,
        organization_id: UUID,
        query: str,
        top_k: int = 6,
    ) -> list[tuple[OrgKnowledgeChunk, float]]:
        q = (query or "").strip()
        if not q:
            return []
        vectors = await embed_texts([q], task_type="RETRIEVAL_QUERY")
        if not vectors or not vectors[0]:
            return []
        query_vec = vectors[0]
        rows = await self.chunks.list_for_org(organization_id=organization_id)
        scored: list[tuple[OrgKnowledgeChunk, float]] = []
        for row in rows:
            emb = row.embedding if isinstance(row.embedding, list) else []
            score = cosine_similarity(query_vec, [float(x) for x in emb])
            if score >= 0:
                scored.append((row, score))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]

    async def index_survey(self, survey: Survey) -> None:
        if survey.organization_id is None:
            return
        goal = ""
        if survey.plan_id is not None:
            plan = await self.plans.get_for_org(
                plan_id=survey.plan_id, organization_id=survey.organization_id
            )
            if plan is not None:
                goal = plan.research_goal or ""
        body = "\n".join(
            part
            for part in (
                f"Status: {survey.status}",
                f"Description: {survey.description or ''}",
                f"Research goal: {goal}",
            )
            if part
        )
        await self.upsert_chunk(
            organization_id=survey.organization_id,
            source_type=KnowledgeSourceType.survey,
            source_id=survey.id,
            survey_id=survey.id,
            title=survey.title,
            body=body,
        )

    async def index_report(
        self,
        *,
        organization_id: UUID,
        report_id: UUID,
        survey_id: UUID,
        title: str,
        sections: list[dict[str, Any]] | None,
    ) -> None:
        parts: list[str] = []
        for sec in sections or []:
            if not isinstance(sec, dict):
                continue
            st = str(sec.get("title") or "").strip()
            content = str(sec.get("content") or "").strip()
            if st or content:
                parts.append(f"{st}: {content}" if st else content)
        body = _truncate("\n".join(parts))
        await self.upsert_chunk(
            organization_id=organization_id,
            source_type=KnowledgeSourceType.report,
            source_id=report_id,
            survey_id=survey_id,
            title=title,
            body=body or title,
        )

    async def index_review(
        self,
        *,
        organization_id: UUID,
        report: ReviewerReport,
        survey_id: UUID,
        survey_title: str,
    ) -> None:
        findings = []
        for f in report.findings or []:
            findings.append(
                f"{getattr(f, 'issue_type', '')}: {getattr(f, 'explanation', '')}"
            )
        body = _truncate(
            f"Survey: {survey_title}. Quality score: {report.overall_quality_score}. "
            f"Findings ({len(findings)}): " + " | ".join(findings[:12])
        )
        await self.upsert_chunk(
            organization_id=organization_id,
            source_type=KnowledgeSourceType.review,
            source_id=report.id,
            survey_id=survey_id,
            title=f"AI review — {survey_title}",
            body=body,
        )

    async def reindex_organization(self, *, organization_id: UUID) -> dict[str, int]:
        """Backfill chunks for all surveys/reports/reviews in an org."""
        surveys = await self.surveys.list_for_org(
            organization_id=organization_id,
            require_plan=False,
            with_tree=False,
            limit=500,
        )
        survey_n = 0
        for survey in surveys:
            try:
                await self.index_survey(survey)
                survey_n += 1
            except Exception:
                logger.exception("reindex survey failed %s", survey.id)

        report_n = 0
        for survey in surveys:
            latest = await self.reports.latest_for_survey(survey_id=survey.id)
            if latest is None:
                continue
            try:
                await self.index_report(
                    organization_id=organization_id,
                    report_id=latest.id,
                    survey_id=survey.id,
                    title=latest.title,
                    sections=list(latest.sections or []),
                )
                report_n += 1
            except Exception:
                logger.exception("reindex report failed %s", latest.id)

        review_n = 0
        for survey in surveys:
            rev = await self.reviewer_reports.latest_for_survey(survey_id=survey.id)
            if rev is None:
                continue
            try:
                await self.index_review(
                    organization_id=organization_id,
                    report=rev,
                    survey_id=survey.id,
                    survey_title=survey.title,
                )
                review_n += 1
            except Exception:
                logger.exception("reindex review failed %s", rev.id)

        await self.session.commit()
        return {"surveys": survey_n, "reports": report_n, "reviews": review_n}
