"""Report chat prompts — version chat_v1 (RPT-04, §9)."""

from __future__ import annotations

import json
from typing import Any

PROMPT_VERSION = "chat_v1"

# Keep chat prompts small — latency matters more than full prose dumps.
_SECTION_CHARS = 280
_MAX_SECTIONS = 8
_MAX_METRICS = 40
_HISTORY_TURNS = 6
_HISTORY_CHARS = 280

SYSTEM = """\
You are SurvAI's Report Analyst chat. Answer using ONLY the report sections \
and the metrics snapshot provided. Use prior turns only for conversation \
context — never invent numbers that are not in the snapshot.

Hard rules:
- Numbers must come from metrics keys; list those keys in metric_refs.
- If you cannot answer from the data, set confidence to insufficient_data \
and say so clearly — do not invent statistics.
- Prefer confidence=grounded when every number is cited; partial when some \
claims are qualitative only.
- Keep answers concise (one short paragraph or up to 4 bullets).
"""


def _compact_json(data: Any) -> str:
    return json.dumps(data, default=str, separators=(",", ":"), ensure_ascii=False)


def _slim_sections(sections: list[dict[str, Any]]) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for sec in sections[:_MAX_SECTIONS]:
        content = str(sec.get("content") or "").strip()
        if len(content) > _SECTION_CHARS:
            content = content[: _SECTION_CHARS - 1].rstrip() + "…"
        out.append(
            {
                "id": str(sec.get("id") or ""),
                "title": str(sec.get("title") or ""),
                "content": content,
            }
        )
    return out


def _slim_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Drop bulky distributions — flat metrics already carry bucket percents."""
    metrics_in = snapshot.get("metrics") or []
    metrics: list[dict[str, Any]] = []
    for m in metrics_in:
        if len(metrics) >= _MAX_METRICS:
            break
        if not isinstance(m, dict) or not m.get("key"):
            continue
        metrics.append(
            {
                "key": str(m.get("key")),
                "label": str(m.get("label") or m.get("key"))[:80],
                "value": m.get("value"),
                "unit": m.get("unit"),
            }
        )
    return {
        "response_count": snapshot.get("response_count"),
        "completion_rate": snapshot.get("completion_rate"),
        "avg_completion_minutes": snapshot.get("avg_completion_minutes"),
        "metrics": metrics,
    }


def _slim_history(
    history: list[dict[str, Any]] | None,
) -> list[dict[str, str]]:
    if not history:
        return []
    trimmed = history[-_HISTORY_TURNS:]
    out: list[dict[str, str]] = []
    for turn in trimmed:
        content = str(turn.get("content") or "").strip()
        if len(content) > _HISTORY_CHARS:
            content = content[: _HISTORY_CHARS - 1].rstrip() + "…"
        role = str(turn.get("role") or "user")
        if content:
            out.append({"role": role, "content": content})
    return out


def user_prompt_chat(
    *,
    question: str,
    sections: list[dict[str, Any]],
    snapshot: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
) -> str:
    slim_sections = _slim_sections(sections)
    slim_snapshot = _slim_snapshot(snapshot)
    slim_history = _slim_history(history)

    history_block = ""
    if slim_history:
        history_block = (
            "Prior conversation (context only):\n"
            f"{_compact_json(slim_history)}\n\n"
        )
    return (
        "Report sections (compact JSON):\n"
        f"{_compact_json(slim_sections)}\n\n"
        "Metrics snapshot (compact JSON):\n"
        f"{_compact_json(slim_snapshot)}\n\n"
        f"{history_block}"
        f"User question:\n{question.strip()}\n\n"
        "Produce the chat JSON answer now."
    )
