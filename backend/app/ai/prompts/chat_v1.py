"""Report chat prompts — version chat_v2 (RPT-04, §9, latency-first)."""

from __future__ import annotations

import json
from typing import Any

PROMPT_VERSION = "chat_v2"

# Aggressive caps — chat latency tracks prompt size more than prose quality.
_SECTION_CHARS = 140
_MAX_SECTIONS = 5
_MAX_METRICS = 24
_HISTORY_TURNS = 4
_HISTORY_CHARS = 160

_PRIORITY_SECTION_IDS = (
    "executive_summary",
    "key_findings",
    "limitations",
    "recommendations",
    "respondent_profile",
)

SYSTEM = """\
You are SurvAI's Report Analyst chat. Answer using ONLY the report excerpts \
and metrics snapshot provided. Use prior turns only for conversation context \
— never invent numbers that are not in the snapshot.

Hard rules:
- Numbers must come from metrics keys; list those keys in metric_refs.
- If you cannot answer from the data, set confidence to insufficient_data \
and say so clearly — do not invent statistics.
- Prefer confidence=grounded when every number is cited; partial when some \
claims are qualitative only.
- Keep answers very concise (2–4 sentences or up to 4 short bullets).
"""


def _compact_json(data: Any) -> str:
    return json.dumps(data, default=str, separators=(",", ":"), ensure_ascii=False)


def _slim_sections(sections: list[dict[str, Any]]) -> list[dict[str, str]]:
    by_id = {
        str(sec.get("id") or ""): sec
        for sec in sections
        if isinstance(sec, dict)
    }
    ordered: list[dict[str, Any]] = []
    seen: set[str] = set()
    for sid in _PRIORITY_SECTION_IDS:
        sec = by_id.get(sid)
        if sec is not None:
            ordered.append(sec)
            seen.add(sid)
    for sec in sections:
        if not isinstance(sec, dict):
            continue
        sid = str(sec.get("id") or "")
        if sid in seen:
            continue
        ordered.append(sec)
        seen.add(sid)
        if len(ordered) >= _MAX_SECTIONS:
            break

    out: list[dict[str, str]] = []
    for sec in ordered[:_MAX_SECTIONS]:
        content = str(sec.get("content") or "").strip()
        if len(content) > _SECTION_CHARS:
            content = content[: _SECTION_CHARS - 1].rstrip() + "…"
        out.append(
            {
                "id": str(sec.get("id") or ""),
                "title": str(sec.get("title") or "")[:80],
                "content": content,
            }
        )
    return out


def _metric_priority(m: dict[str, Any]) -> tuple[int, str]:
    key = str(m.get("key") or "")
    if key in {"total_responses", "completion_rate", "avg_completion_minutes"}:
        return (0, key)
    if key.startswith(("total_", "completion_", "avg_")):
        return (1, key)
    # Prefer simple share/count metrics over long distribution keys.
    if "_pct" in key or key.endswith("_count"):
        return (2, key)
    return (3, key)


def _slim_snapshot(snapshot: dict[str, Any]) -> dict[str, Any]:
    """Drop distributions; keep a small flat metrics list for grounding."""
    metrics_in = [m for m in (snapshot.get("metrics") or []) if isinstance(m, dict)]
    metrics_in.sort(key=_metric_priority)
    metrics: list[dict[str, Any]] = []
    for m in metrics_in:
        if len(metrics) >= _MAX_METRICS:
            break
        if not m.get("key"):
            continue
        metrics.append(
            {
                "key": str(m.get("key")),
                "label": str(m.get("label") or m.get("key"))[:60],
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
            "Prior turns:\n"
            f"{_compact_json(slim_history)}\n\n"
        )
    return (
        "Metrics (source of truth; cite keys in metric_refs):\n"
        f"{_compact_json(slim_snapshot)}\n\n"
        "Report excerpts:\n"
        f"{_compact_json(slim_sections)}\n\n"
        f"{history_block}"
        f"Q:\n{question.strip()}\n\n"
        "Answer as JSON now."
    )
