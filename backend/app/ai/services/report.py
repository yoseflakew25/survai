"""Report + report-chat Gemini calls."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import StructuredCallResult, call_structured
from app.ai.prompts import chat_v1, report_v1
from app.ai.schemas import ReportChatOutput, ReportGenerationOutput
from app.core.i18n import normalize_locale, with_content_language


async def generate_report(
    *,
    survey_title: str,
    audience: str,
    snapshot: dict[str, Any],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
    content_language: str | None = None,
) -> StructuredCallResult:
    lang = content_language or snapshot.get("content_language") or "en"
    system = with_content_language(report_v1.SYSTEM, lang)
    return await call_structured(
        feature="report",
        system=system,
        user=report_v1.user_prompt_report(
            survey_title=survey_title,
            audience=audience,
            snapshot=snapshot,
        ),
        schema=ReportGenerationOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "survey_id": snapshot.get("survey_id"),
            "survey_version_id": snapshot.get("survey_version_id"),
            "response_count": snapshot.get("response_count"),
            "audience": audience,
            "content_language": lang,
        },
    )


async def answer_report_chat(
    *,
    question: str,
    sections: list[dict[str, Any]],
    snapshot: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
    ui_locale: str | None = None,
) -> StructuredCallResult:
    locale = normalize_locale(ui_locale)
    system = with_content_language(chat_v1.SYSTEM, locale)
    return await call_structured(
        feature="report_chat",
        system=system,
        user=chat_v1.user_prompt_chat(
            question=question,
            sections=sections,
            snapshot=snapshot,
            history=history,
        ),
        schema=ReportChatOutput,
        user_id=user_id,
        session=session,
        input_meta={
            "survey_id": snapshot.get("survey_id"),
            "question_chars": len(question),
            "history_turns": len(history or []),
            "ui_locale": locale,
        },
    )
