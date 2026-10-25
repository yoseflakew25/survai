"""Single Gemini gateway — all structured AI calls go through here."""

from __future__ import annotations

import asyncio
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

from app.ai.prompts import builder_v1, chat_v1, planner_v1, report_v1, reviewer_v1
from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.models.ai_generation_log import AiGenerationLog

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

# Per-attempt ceiling so a hung model (e.g. broken structured-output
# support) fails over instead of holding the request/DB session forever.
_GENERATE_TIMEOUT_S = 45.0
_REPORT_GENERATE_TIMEOUT_S = 120.0
_REPORT_MAX_OUTPUT_TOKENS = 8192

_FEATURE_PROMPT_VERSIONS: dict[str, str] = {
    "planner": planner_v1.PROMPT_VERSION,
    "builder": builder_v1.PROMPT_VERSION,
    "reviewer": reviewer_v1.PROMPT_VERSION,
    "report": report_v1.PROMPT_VERSION,
    "report_chat": chat_v1.PROMPT_VERSION,
}


def _timeout_for(feature: str) -> float:
    if feature == "report":
        return _REPORT_GENERATE_TIMEOUT_S
    return _GENERATE_TIMEOUT_S


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


def _models_for(feature: str) -> list[str]:
    """Primary model first, then configured fallbacks (deduped)."""
    primary = _model_for(feature)
    fallbacks = [
        m.strip()
        for m in (settings.gemini_model_fallbacks or "").split(",")
        if m.strip()
    ]
    ordered: list[str] = []
    for name in [primary, *fallbacks]:
        if name and name not in ordered:
            ordered.append(name)
    return ordered or [primary]


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
    """Call Gemini with JSON schema enforcement; validate with Pydantic.

    On quota / high-demand errors, advance to the next model in the fallback
    list instead of retrying the same exhausted model.
    """
    models = _models_for(feature)
    prompt_version = _prompt_version_for(feature)
    request_id = str(uuid.uuid4())
    client = _client()
    last_error: Exception | None = None
    model_idx = 0

    # attempts across schema retries; capacity errors rotate models.
    attempt = 0
    while attempt < max_attempts * len(models) and model_idx < len(models):
        model = models[model_idx]
        attempt += 1
        started = time.monotonic()
        try:
            gen_config_kwargs: dict[str, Any] = {
                "system_instruction": system,
                "response_mime_type": "application/json",
                "response_schema": schema,
                "temperature": 0.4 if feature != "report" else 0.55,
                # Structured JSON only — AFC can hang on some models.
                "automatic_function_calling": types.AutomaticFunctionCallingConfig(
                    disable=True
                ),
            }
            if feature == "report":
                gen_config_kwargs["max_output_tokens"] = _REPORT_MAX_OUTPUT_TOKENS

            response = await asyncio.wait_for(
                client.aio.models.generate_content(
                    model=model,
                    contents=user,
                    config=types.GenerateContentConfig(**gen_config_kwargs),
                ),
                timeout=_timeout_for(feature),
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
                    "AI schema validation failed feature=%s model=%s attempt=%s",
                    feature,
                    model,
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
            logger.exception(
                "AI call failed feature=%s model=%s attempt=%s",
                feature,
                model,
                attempt,
            )
            if _is_fatal_ai_error(exc):
                break
            if isinstance(exc, TimeoutError) or _is_capacity_ai_error(exc):
                model_idx += 1
                logger.warning(
                    "AI timeout/capacity feature=%s; trying next model (%s/%s)",
                    feature,
                    model_idx + 1,
                    len(models),
                )
                continue
            # Other transient errors: retry same model once, then move on.
            if attempt % max_attempts == 0:
                model_idx += 1

    raise BadRequestError(_user_message_for_ai_error(feature, last_error)) from last_error


def _is_capacity_ai_error(exc: BaseException) -> bool:
    text = str(exc).upper()
    return any(
        token in text
        for token in (
            "RESOURCE_EXHAUSTED",
            "UNAVAILABLE",
            "HIGH DEMAND",
            "429 ",
            "503 ",
        )
    )


def _is_fatal_ai_error(exc: BaseException) -> bool:
    text = str(exc).upper()
    return any(
        token in text
        for token in (
            "INVALID_ARGUMENT",
            "PERMISSION_DENIED",
            "NOT_FOUND",
            "404 ",
        )
    )


def _user_message_for_ai_error(feature: str, exc: BaseException | None) -> str:
    if exc is None:
        return f"AI could not produce a valid {feature} result. Please try again."
    if isinstance(exc, TimeoutError):
        return (
            f"AI {feature} timed out. The model may be overloaded — try again, "
            "or switch GEMINI_MODEL_REVIEWER to gemini-3.1-flash-lite."
        )
    text = str(exc)
    upper = text.upper()
    if "RESOURCE_EXHAUSTED" in upper or "429" in upper or "QUOTA" in upper:
        return (
            "AI quota exceeded for this model. Wait for the daily limit to reset, "
            "switch GEMINI_MODEL_* in the backend .env, or enable billing on the "
            "Gemini API key."
        )
    if "UNAVAILABLE" in upper or "HIGH DEMAND" in upper or "503" in upper:
        return (
            "AI is temporarily overloaded. Please wait a moment and try again."
        )
    if "INVALID_ARGUMENT" in upper:
        return (
            f"AI rejected the {feature} request (invalid argument). "
            "Check the model name and response schema, then try again."
        )
    return f"AI could not produce a valid {feature} result. Please try again."
