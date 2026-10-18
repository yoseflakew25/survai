"""Single Gemini gateway — all structured AI calls go through here."""

from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass
from typing import Any, TypeVar
from uuid import UUID

from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import planner_v1
from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.models.ai_generation_log import AiGenerationLog

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

_FEATURE_PROMPT_VERSIONS: dict[str, str] = {
    "planner": planner_v1.PROMPT_VERSION,
}


@dataclass(frozen=True)
class StructuredCallResult:
    value: BaseModel
    model: str
    prompt_version: str
    request_id: str
    latency_ms: int


def _client() -> genai.Client:
    key = (settings.gemini_api_key or "").strip()
    if not key:
        raise BadRequestError(
            "AI is not configured. Set GEMINI_API_KEY in the backend environment."
        )
    return genai.Client(api_key=key)


def _model_for(feature: str) -> str:
    mapping = {
        "planner": settings.gemini_model_planner,
        "builder": settings.gemini_model_builder,
        "reviewer": settings.gemini_model_reviewer,
        "report": settings.gemini_model_report,
        "report_chat": settings.gemini_model_chat,
    }
    return mapping.get(feature, settings.gemini_model_planner)


def _prompt_version_for(feature: str) -> str:
    return _FEATURE_PROMPT_VERSIONS.get(feature, f"{feature}_v1")


def _usage_tokens(response: Any) -> tuple[int | None, int | None]:
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return None, None
    return (
        getattr(meta, "prompt_token_count", None),
        getattr(meta, "candidates_token_count", None),
    )


async def _write_log(
    session: AsyncSession | None,
    *,
    feature: str,
    user_id: UUID | None,
    model: str,
    prompt_version: str,
    input_meta: dict[str, Any] | None,
    tokens_input: int | None,
    tokens_output: int | None,
    latency_ms: int,
    status: str,
    error_message: str | None = None,
) -> None:
    if session is None:
        return
    session.add(
        AiGenerationLog(
            feature=feature,
            user_id=user_id,
            prompt_version=prompt_version,
            model=model,
            input_meta=input_meta,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            status=status,
            error_message=error_message,
        )
    )
    await session.flush()


async def call_structured(
    *,
    feature: str,
    system: str,
    user: str,
    schema: type[T],
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
    input_meta: dict[str, Any] | None = None,
    max_attempts: int = 2,
) -> StructuredCallResult:
    """Call Gemini with JSON schema enforcement; validate with Pydantic."""
    model = _model_for(feature)
    prompt_version = _prompt_version_for(feature)
    request_id = str(uuid.uuid4())
    client = _client()
    last_error: Exception | None = None

    for attempt in range(1, max_attempts + 1):
        started = time.monotonic()
        try:
            response = await client.aio.models.generate_content(
                model=model,
                contents=user,
                config=types.GenerateContentConfig(
                    system_instruction=system,
                    response_mime_type="application/json",
                    response_schema=schema,
                    temperature=0.4,
                ),
            )
            latency_ms = int((time.monotonic() - started) * 1000)
            tokens_in, tokens_out = _usage_tokens(response)
            raw = (response.text or "").strip()
            if not raw:
                raise RuntimeError("Empty model response")

            try:
                result = schema.model_validate_json(raw)
            except ValidationError as exc:
                await _write_log(
                    session,
                    feature=feature,
                    user_id=user_id,
                    model=model,
                    prompt_version=prompt_version,
                    input_meta=input_meta,
                    tokens_input=tokens_in,
                    tokens_output=tokens_out,
                    latency_ms=latency_ms,
                    status="schema_validation_failed",
                    error_message=str(exc)[:2000],
                )
                last_error = exc
                logger.warning(
                    "AI schema validation failed feature=%s attempt=%s",
                    feature,
                    attempt,
                )
                continue

            await _write_log(
                session,
                feature=feature,
                user_id=user_id,
                model=model,
                prompt_version=prompt_version,
                input_meta=input_meta,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=latency_ms,
                status="success",
            )
            return StructuredCallResult(
                value=result,
                model=model,
                prompt_version=prompt_version,
                request_id=request_id,
                latency_ms=latency_ms,
            )

        except BadRequestError:
            raise
        except Exception as exc:
            latency_ms = int((time.monotonic() - started) * 1000)
            last_error = exc
            await _write_log(
                session,
                feature=feature,
                user_id=user_id,
                model=model,
                prompt_version=prompt_version,
                input_meta=input_meta,
                tokens_input=None,
                tokens_output=None,
                latency_ms=latency_ms,
                status="error",
                error_message=str(exc)[:2000],
            )
            logger.exception("AI call failed feature=%s attempt=%s", feature, attempt)

    raise BadRequestError(
        f"AI could not produce a valid {feature} result. Please try again."
    ) from last_error
