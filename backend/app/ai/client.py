"""AI gateway — CfA Bedrock sandbox primary, Gemini backup.

All structured AI calls go through here. Routes/services must not call vendors
directly. Primary provider is the Code for Africa LiteLLM gateway (OpenAI
dialect → Amazon Bedrock). Gemini is used when CFA is unavailable or exhausted.
"""

from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Any, Literal, TypeVar
from uuid import UUID

import httpx
from google import genai
from google.genai import types
from pydantic import BaseModel, ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.prompts import (
    builder_v1,
    chat_v1,
    planner_interview_v1,
    planner_v1,
    report_v1,
    reviewer_v1,
)
from app.core.config import settings
from app.core.exceptions import BadRequestError
from app.models.ai_generation_log import AiGenerationLog

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)
Provider = Literal["cfa", "gemini"]

# Per-attempt ceiling so a hung model fails over instead of holding the request.
_GENERATE_TIMEOUT_S = 45.0
_REPORT_GENERATE_TIMEOUT_S = 120.0
_REPORT_MAX_OUTPUT_TOKENS = 8192
_CHAT_MAX_OUTPUT_TOKENS = 384
_CHAT_GENERATE_TIMEOUT_S = 20.0

_FEATURE_PROMPT_VERSIONS: dict[str, str] = {
    "planner": planner_v1.PROMPT_VERSION,
    "planner_interview": planner_interview_v1.PROMPT_VERSION,
    "builder": builder_v1.PROMPT_VERSION,
    "reviewer": reviewer_v1.PROMPT_VERSION,
    "report": report_v1.PROMPT_VERSION,
    "report_chat": chat_v1.PROMPT_VERSION,
    "assistant_plan": "assistant_v1",
    "assistant_answer": "assistant_v1",
}


def _timeout_for(feature: str) -> float:
    if feature == "report":
        return _REPORT_GENERATE_TIMEOUT_S
    if feature in ("report_chat", "planner_interview"):
        return _CHAT_GENERATE_TIMEOUT_S
    return _GENERATE_TIMEOUT_S


def _max_tokens_for(feature: str) -> int:
    if feature == "report":
        return _REPORT_MAX_OUTPUT_TOKENS
    if feature.startswith("assistant") or feature == "planner_interview":
        return 768
    if feature == "report_chat":
        return _CHAT_MAX_OUTPUT_TOKENS
    return 2048


def _temperature_for(feature: str) -> float:
    if feature == "report":
        return 0.55
    if feature == "report_chat":
        return 0.2
    if feature in ("assistant_plan", "assistant_answer", "planner_interview"):
        return 0.25
    return 0.4


@dataclass(frozen=True)
class StructuredCallResult:
    value: BaseModel
    model: str
    prompt_version: str
    request_id: str
    latency_ms: int


def _gemini_client() -> genai.Client:
    key = (settings.gemini_api_key or "").strip()
    if not key:
        raise BadRequestError(
            "Gemini backup is not configured. Set GEMINI_API_KEY in the backend environment."
        )
    return genai.Client(api_key=key)


def _cfa_configured() -> bool:
    return bool((settings.cfa_sandbox_api_key or "").strip())


def _gemini_configured() -> bool:
    return bool((settings.gemini_api_key or "").strip())


def _split_models(raw: str) -> list[str]:
    return [m.strip() for m in (raw or "").split(",") if m.strip()]


def _cfa_model_for(feature: str) -> str:
    mapping = {
        "planner": settings.cfa_sandbox_model_planner,
        "planner_interview": (
            settings.cfa_sandbox_model_assistant or settings.cfa_sandbox_model_chat
        ),
        "builder": settings.cfa_sandbox_model_builder,
        "reviewer": settings.cfa_sandbox_model_reviewer,
        "report": settings.cfa_sandbox_model_report,
        "report_chat": settings.cfa_sandbox_model_chat,
        "assistant_plan": settings.cfa_sandbox_model_assistant,
        "assistant_answer": settings.cfa_sandbox_model_assistant,
    }
    return mapping.get(feature, settings.cfa_sandbox_model_planner)


def _gemini_model_for(feature: str) -> str:
    mapping = {
        "planner": settings.gemini_model_planner,
        "planner_interview": (
            settings.gemini_model_assistant or settings.gemini_model_chat
        ),
        "builder": settings.gemini_model_builder,
        "reviewer": settings.gemini_model_reviewer,
        "report": settings.gemini_model_report,
        "report_chat": settings.gemini_model_chat,
        "assistant_plan": settings.gemini_model_assistant,
        "assistant_answer": settings.gemini_model_assistant,
    }
    return mapping.get(feature, settings.gemini_model_planner)


def _dedupe(models: list[str]) -> list[str]:
    ordered: list[str] = []
    for name in models:
        if name and name not in ordered:
            ordered.append(name)
    return ordered


def _candidates_for(feature: str) -> list[tuple[Provider, str]]:
    """Ordered (provider, model) pairs: CFA first when configured, then Gemini."""
    primary = settings.ai_provider
    out: list[tuple[Provider, str]] = []

    def add_cfa() -> None:
        if not _cfa_configured():
            return
        models = _dedupe(
            [_cfa_model_for(feature), *_split_models(settings.cfa_sandbox_model_fallbacks)]
        )
        for m in models:
            out.append(("cfa", m))

    def add_gemini() -> None:
        if not _gemini_configured():
            return
        models = _dedupe(
            [_gemini_model_for(feature), *_split_models(settings.gemini_model_fallbacks)]
        )
        for m in models:
            out.append(("gemini", m))

    if primary == "cfa":
        add_cfa()
        if settings.ai_fallback_to_gemini:
            add_gemini()
    else:
        add_gemini()

    if not out:
        raise BadRequestError(
            "AI is not configured. Set CFA_SANDBOX_API_KEY (primary) and/or "
            "GEMINI_API_KEY (backup) in the backend environment."
        )
    return out


def _prompt_version_for(feature: str) -> str:
    return _FEATURE_PROMPT_VERSIONS.get(feature, f"{feature}_v1")


def _usage_tokens_gemini(response: Any) -> tuple[int | None, int | None]:
    meta = getattr(response, "usage_metadata", None)
    if meta is None:
        return None, None
    return (
        getattr(meta, "prompt_token_count", None),
        getattr(meta, "candidates_token_count", None),
    )


def extract_json_string_field_prefix(buf: str, key: str) -> str | None:
    """Best-effort unescape of a JSON string field from a partial buffer.

    Used while structured JSON is still streaming so callers can emit true
    token deltas for `assistant_reply` before the full object validates.
    """
    needle = f'"{key}"'
    idx = buf.find(needle)
    if idx < 0:
        return None
    i = idx + len(needle)
    while i < len(buf) and buf[i] in " \t\n\r":
        i += 1
    if i >= len(buf) or buf[i] != ":":
        return None
    i += 1
    while i < len(buf) and buf[i] in " \t\n\r":
        i += 1
    if i >= len(buf) or buf[i] != '"':
        return None
    i += 1
    out: list[str] = []
    escapes = {"n": "\n", "t": "\t", "r": "\r", '"': '"', "\\": "\\", "/": "/"}
    while i < len(buf):
        c = buf[i]
        if c == "\\":
            if i + 1 >= len(buf):
                break
            nxt = buf[i + 1]
            if nxt in escapes:
                out.append(escapes[nxt])
                i += 2
                continue
            if nxt == "u" and i + 5 < len(buf):
                hexpart = buf[i + 2 : i + 6]
                if all(ch in "0123456789abcdefABCDEF" for ch in hexpart):
                    out.append(chr(int(hexpart, 16)))
                    i += 6
                    continue
            break
        if c == '"':
            break
        out.append(c)
        i += 1
    return "".join(out)


def _strip_code_fence(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        if text.endswith("```"):
            text = text[: -3]
        text = text.strip()
        if text.startswith("json"):
            text = text[4:].lstrip()
    return text


def _system_with_json_schema(system: str, schema: type[BaseModel]) -> str:
    schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
    return (
        f"{system.rstrip()}\n\n"
        "You must respond with a single JSON object only — no markdown fences, "
        "no commentary. The object must validate against this JSON Schema:\n"
        f"{schema_json}"
    )


def _gemini_gen_config(
    *,
    feature: str,
    system: str,
    schema: type[BaseModel],
) -> types.GenerateContentConfig:
    gen_config_kwargs: dict[str, Any] = {
        "system_instruction": system,
        "response_mime_type": "application/json",
        "response_schema": schema,
        "temperature": _temperature_for(feature),
        "automatic_function_calling": types.AutomaticFunctionCallingConfig(
            disable=True
        ),
    }
    if feature == "report":
        gen_config_kwargs["max_output_tokens"] = _REPORT_MAX_OUTPUT_TOKENS
    elif feature in (
        "report_chat",
        "assistant_plan",
        "assistant_answer",
        "planner_interview",
    ):
        gen_config_kwargs["max_output_tokens"] = _max_tokens_for(feature)
        gen_config_kwargs["thinking_config"] = types.ThinkingConfig(
            thinking_level=types.ThinkingLevel.MINIMAL
        )
    return types.GenerateContentConfig(**gen_config_kwargs)


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
    meta = dict(input_meta or {})
    session.add(
        AiGenerationLog(
            feature=feature,
            user_id=user_id,
            prompt_version=prompt_version,
            model=model,
            input_meta=meta,
            tokens_input=tokens_input,
            tokens_output=tokens_output,
            latency_ms=latency_ms,
            status=status,
            error_message=error_message,
        )
    )
    await session.flush()


def _cfa_base() -> str:
    return (settings.cfa_sandbox_base_url or "").rstrip("/")


async def _cfa_chat_completion(
    *,
    model: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    feature: str,
    timeout_s: float,
) -> tuple[str, int | None, int | None]:
    """OpenAI-compatible chat completion via CfA sandbox. Returns (raw, tin, tout)."""
    key = (settings.cfa_sandbox_api_key or "").strip()
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _system_with_json_schema(system, schema)},
            {"role": "user", "content": user},
        ],
        "temperature": _temperature_for(feature),
        "max_tokens": _max_tokens_for(feature),
        "response_format": {"type": "json_object"},
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
    }
    url = f"{_cfa_base()}/v1/chat/completions"
    async with httpx.AsyncClient(timeout=timeout_s) as client:
        res = await client.post(url, headers=headers, json=payload)
        if res.status_code == 400 and "json_object" in (res.text or "").lower():
            # Some Bedrock aliases reject response_format — retry prompt-only JSON.
            payload.pop("response_format", None)
            res = await client.post(url, headers=headers, json=payload)
        if res.status_code >= 400:
            raise RuntimeError(
                f"CFA {res.status_code}: {(res.text or '')[:800]}"
            )
        data = res.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError("Empty CFA model response (no choices)")
    content = (choices[0].get("message") or {}).get("content") or ""
    raw = _strip_code_fence(str(content))
    usage = data.get("usage") or {}
    return (
        raw,
        usage.get("prompt_tokens"),
        usage.get("completion_tokens"),
    )


async def _cfa_chat_completion_stream(
    *,
    model: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    feature: str,
    stream_field: str,
    timeout_s: float,
) -> AsyncIterator[tuple[str, Any]]:
    """Yields ('delta', text) then ('raw', (raw, tin, tout))."""
    key = (settings.cfa_sandbox_api_key or "").strip()
    payload: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": _system_with_json_schema(system, schema)},
            {"role": "user", "content": user},
        ],
        "temperature": _temperature_for(feature),
        "max_tokens": _max_tokens_for(feature),
        "response_format": {"type": "json_object"},
        "stream": True,
        "stream_options": {"include_usage": True},
    }
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "Accept": "text/event-stream",
    }
    url = f"{_cfa_base()}/v1/chat/completions"
    raw_parts: list[str] = []
    emitted = ""
    tokens_in: int | None = None
    tokens_out: int | None = None

    async with httpx.AsyncClient(timeout=timeout_s) as client:
        try:
            async with client.stream(
                "POST", url, headers=headers, json=payload
            ) as res:
                if res.status_code >= 400:
                    body = (await res.aread()).decode("utf-8", errors="replace")
                    if res.status_code == 400 and "json_object" in body.lower():
                        payload.pop("response_format", None)
                        async with client.stream(
                            "POST", url, headers=headers, json=payload
                        ) as res2:
                            if res2.status_code >= 400:
                                body2 = (
                                    await res2.aread()
                                ).decode("utf-8", errors="replace")
                                raise RuntimeError(
                                    f"CFA {res2.status_code}: {body2[:800]}"
                                )
                            async for event in _iter_cfa_sse(
                                res2,
                                raw_parts=raw_parts,
                                emitted=emitted,
                                stream_field=stream_field,
                            ):
                                if event[0] == "delta":
                                    emitted = event[2]
                                    yield ("delta", event[1])
                                elif event[0] == "usage":
                                    tokens_in, tokens_out = event[1], event[2]
                    else:
                        raise RuntimeError(f"CFA {res.status_code}: {body[:800]}")
                else:
                    async for event in _iter_cfa_sse(
                        res,
                        raw_parts=raw_parts,
                        emitted=emitted,
                        stream_field=stream_field,
                    ):
                        if event[0] == "delta":
                            emitted = event[2]
                            yield ("delta", event[1])
                        elif event[0] == "usage":
                            tokens_in, tokens_out = event[1], event[2]
        except httpx.HTTPError as exc:
            raise RuntimeError(f"CFA stream error: {exc}") from exc

    raw = _strip_code_fence("".join(raw_parts))
    yield ("raw", (raw, tokens_in, tokens_out))


async def _iter_cfa_sse(
    res: httpx.Response,
    *,
    raw_parts: list[str],
    emitted: str,
    stream_field: str,
) -> AsyncIterator[tuple[Any, ...]]:
    """Parse OpenAI SSE; yield ('delta', delta, new_emitted) or ('usage', tin, tout)."""
    current_emitted = emitted
    async for line in res.aiter_lines():
        if not line:
            continue
        if line.startswith(":"):
            continue
        if not line.startswith("data:"):
            continue
        data = line[5:].strip()
        if data == "[DONE]":
            break
        try:
            chunk = json.loads(data)
        except json.JSONDecodeError:
            continue
        usage = chunk.get("usage")
        if usage:
            yield (
                "usage",
                usage.get("prompt_tokens"),
                usage.get("completion_tokens"),
            )
        choices = chunk.get("choices") or []
        if not choices:
            continue
        delta = (choices[0].get("delta") or {}).get("content") or ""
        if not delta:
            continue
        raw_parts.append(delta)
        buf = "".join(raw_parts)
        current = extract_json_string_field_prefix(buf, stream_field)
        if current is not None and len(current) > len(current_emitted):
            piece = current[len(current_emitted) :]
            current_emitted = current
            if piece:
                yield ("delta", piece, current_emitted)


async def _gemini_generate(
    *,
    model: str,
    system: str,
    user: str,
    schema: type[BaseModel],
    feature: str,
    timeout_s: float,
) -> tuple[str, int | None, int | None]:
    client = _gemini_client()
    response = await asyncio.wait_for(
        client.aio.models.generate_content(
            model=model,
            contents=user,
            config=_gemini_gen_config(
                feature=feature, system=system, schema=schema
            ),
        ),
        timeout=timeout_s,
    )
    tin, tout = _usage_tokens_gemini(response)
    raw = _strip_code_fence((response.text or "").strip())
    return raw, tin, tout


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
    """Structured JSON generation via CFA (primary) then Gemini (backup)."""
    candidates = _candidates_for(feature)
    prompt_version = _prompt_version_for(feature)
    request_id = str(uuid.uuid4())
    last_error: Exception | None = None
    timeout_s = _timeout_for(feature)

    # Schema retries per model; capacity errors advance to the next candidate.
    attempt = 0
    model_idx = 0
    while attempt < max_attempts * len(candidates) and model_idx < len(candidates):
        provider, model = candidates[model_idx]
        labeled = f"{provider}:{model}"
        attempt += 1
        started = time.monotonic()
        meta = {**(input_meta or {}), "provider": provider}
        try:
            if provider == "cfa":
                raw, tokens_in, tokens_out = await _cfa_chat_completion(
                    model=model,
                    system=system,
                    user=user,
                    schema=schema,
                    feature=feature,
                    timeout_s=timeout_s,
                )
            else:
                raw, tokens_in, tokens_out = await _gemini_generate(
                    model=model,
                    system=system,
                    user=user,
                    schema=schema,
                    feature=feature,
                    timeout_s=timeout_s,
                )
            latency_ms = int((time.monotonic() - started) * 1000)
            if not raw:
                raise RuntimeError("Empty model response")

            try:
                result = schema.model_validate_json(raw)
            except ValidationError as exc:
                await _write_log(
                    session,
                    feature=feature,
                    user_id=user_id,
                    model=labeled,
                    prompt_version=prompt_version,
                    input_meta=meta,
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
                    labeled,
                    attempt,
                )
                continue

            await _write_log(
                session,
                feature=feature,
                user_id=user_id,
                model=labeled,
                prompt_version=prompt_version,
                input_meta=meta,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=latency_ms,
                status="success",
            )
            return StructuredCallResult(
                value=result,
                model=labeled,
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
                model=labeled,
                prompt_version=prompt_version,
                input_meta=meta,
                tokens_input=None,
                tokens_output=None,
                latency_ms=latency_ms,
                status="error",
                error_message=str(exc)[:2000],
            )
            logger.exception(
                "AI call failed feature=%s model=%s attempt=%s",
                feature,
                labeled,
                attempt,
            )
            if _is_fatal_ai_error(exc):
                if not _is_invalid_argument_ai_error(exc):
                    # Hard auth/not-found on this provider — skip remaining
                    # models for the same provider.
                    model_idx = _skip_provider(candidates, model_idx, provider)
                    continue
                model_idx += 1
                continue
            if isinstance(exc, TimeoutError) or _is_capacity_ai_error(exc):
                model_idx += 1
                continue
            if attempt % max_attempts == 0:
                model_idx += 1

    raise BadRequestError(_user_message_for_ai_error(feature, last_error)) from last_error


def _skip_provider(
    candidates: list[tuple[Provider, str]], idx: int, provider: Provider
) -> int:
    nxt = idx + 1
    while nxt < len(candidates) and candidates[nxt][0] == provider:
        nxt += 1
    return nxt


async def iter_stream_structured(
    *,
    feature: str,
    system: str,
    user: str,
    schema: type[T],
    stream_field: str = "assistant_reply",
    user_id: UUID | None = None,
    session: AsyncSession | None = None,
    input_meta: dict[str, Any] | None = None,
    max_attempts: int = 2,
) -> AsyncIterator[tuple[str, Any]]:
    """Stream structured JSON. Yields deltas then a final StructuredCallResult."""
    candidates = _candidates_for(feature)
    prompt_version = _prompt_version_for(feature)
    request_id = str(uuid.uuid4())
    last_error: Exception | None = None
    timeout_s = _timeout_for(feature)
    attempt = 0
    model_idx = 0

    while attempt < max_attempts * len(candidates) and model_idx < len(candidates):
        provider, model = candidates[model_idx]
        labeled = f"{provider}:{model}"
        attempt += 1
        started = time.monotonic()
        meta = {**(input_meta or {}), "provider": provider}
        raw = ""
        tokens_in: int | None = None
        tokens_out: int | None = None
        try:
            if provider == "cfa":
                async for kind, payload in _cfa_chat_completion_stream(
                    model=model,
                    system=system,
                    user=user,
                    schema=schema,
                    feature=feature,
                    stream_field=stream_field,
                    timeout_s=timeout_s,
                ):
                    if kind == "delta":
                        yield ("delta", payload)
                    elif kind == "raw":
                        raw, tokens_in, tokens_out = payload
            else:
                client = _gemini_client()
                raw_parts: list[str] = []
                emitted_reply = ""
                stream = await client.aio.models.generate_content_stream(
                    model=model,
                    contents=user,
                    config=_gemini_gen_config(
                        feature=feature, system=system, schema=schema
                    ),
                )
                async for chunk in stream:
                    piece = getattr(chunk, "text", None) or ""
                    if piece:
                        raw_parts.append(piece)
                        buf = "".join(raw_parts)
                        current = extract_json_string_field_prefix(buf, stream_field)
                        if current is not None and len(current) > len(emitted_reply):
                            delta = current[len(emitted_reply) :]
                            emitted_reply = current
                            if delta:
                                yield ("delta", delta)
                    tin, tout = _usage_tokens_gemini(chunk)
                    if tin is not None:
                        tokens_in = tin
                    if tout is not None:
                        tokens_out = tout
                raw = _strip_code_fence("".join(raw_parts).strip())

            latency_ms = int((time.monotonic() - started) * 1000)
            if not raw:
                raise RuntimeError("Empty model response")
            try:
                result = schema.model_validate_json(raw)
            except ValidationError as exc:
                await _write_log(
                    session,
                    feature=feature,
                    user_id=user_id,
                    model=labeled,
                    prompt_version=prompt_version,
                    input_meta=meta,
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
                    labeled,
                    attempt,
                )
                continue

            await _write_log(
                session,
                feature=feature,
                user_id=user_id,
                model=labeled,
                prompt_version=prompt_version,
                input_meta=meta,
                tokens_input=tokens_in,
                tokens_output=tokens_out,
                latency_ms=latency_ms,
                status="success",
            )
            yield (
                "result",
                StructuredCallResult(
                    value=result,
                    model=labeled,
                    prompt_version=prompt_version,
                    request_id=request_id,
                    latency_ms=latency_ms,
                ),
            )
            return

        except BadRequestError:
            raise
        except Exception as exc:
            latency_ms = int((time.monotonic() - started) * 1000)
            last_error = exc
            await _write_log(
                session,
                feature=feature,
                user_id=user_id,
                model=labeled,
                prompt_version=prompt_version,
                input_meta=meta,
                tokens_input=None,
                tokens_output=None,
                latency_ms=latency_ms,
                status="error",
                error_message=str(exc)[:2000],
            )
            logger.exception(
                "AI stream failed feature=%s model=%s attempt=%s",
                feature,
                labeled,
                attempt,
            )
            if _is_fatal_ai_error(exc):
                if not _is_invalid_argument_ai_error(exc):
                    model_idx = _skip_provider(candidates, model_idx, provider)
                    continue
                model_idx += 1
                continue
            if isinstance(exc, TimeoutError) or _is_capacity_ai_error(exc):
                model_idx += 1
                continue
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
            "429",
            "503",
            "BUDGET",
            "RATE LIMIT",
            "THROTTL",
        )
    )


def _is_invalid_argument_ai_error(exc: BaseException) -> bool:
    text = str(exc).upper()
    return "INVALID_ARGUMENT" in text or "400 " in text or "INVALID MODEL" in text


def _is_fatal_ai_error(exc: BaseException) -> bool:
    text = str(exc).upper()
    return any(
        token in text
        for token in (
            "INVALID_ARGUMENT",
            "PERMISSION_DENIED",
            "NOT_FOUND",
            "401",
            "403",
            "404",
        )
    )


def _user_message_for_ai_error(feature: str, exc: BaseException | None) -> str:
    if exc is None:
        return f"AI could not produce a valid {feature} result. Please try again."
    if isinstance(exc, TimeoutError):
        return (
            f"AI {feature} timed out. The model may be overloaded — try again."
        )
    text = str(exc)
    upper = text.upper()
    if "BUDGET" in upper:
        return (
            "AI team budget is exhausted for this period. Wait for the reset "
            "or ask an operator — Gemini backup may also be unavailable."
        )
    if "RESOURCE_EXHAUSTED" in upper or "429" in upper or "QUOTA" in upper:
        return (
            "AI quota exceeded. Wait for the limit to reset, or check "
            "CFA_SANDBOX_API_KEY / GEMINI_API_KEY configuration."
        )
    if "UNAVAILABLE" in upper or "HIGH DEMAND" in upper or "503" in upper:
        return (
            "AI is temporarily overloaded. Please wait a moment and try again."
        )
    if "INVALID_ARGUMENT" in upper or "INVALID MODEL" in upper:
        return (
            f"AI rejected the {feature} request (invalid argument/model). "
            "Check CFA/Gemini model names in the backend .env, then try again."
        )
    return f"AI could not produce a valid {feature} result. Please try again."
