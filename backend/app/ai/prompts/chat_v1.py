"""Report chat prompts — version chat_v1 (RPT-04, §9)."""

from __future__ import annotations

import json
from typing import Any

PROMPT_VERSION = "chat_v1"

SYSTEM = """\
You are SurvAI's Report Analyst chat. Answer using ONLY the report sections \
and the metrics snapshot provided.

Hard rules:
- Numbers must come from metrics keys; list those keys in metric_refs.
- If you cannot answer from the data, set confidence to insufficient_data \
and say so clearly — do not invent statistics.
- Prefer confidence=grounded when every number is cited; partial when some \
claims are qualitative only.
"""


def user_prompt_chat(
    *,
    question: str,
    sections: list[dict[str, Any]],
    snapshot: dict[str, Any],
) -> str:
    return (
        "Report sections (JSON):\n"
        f"{json.dumps(sections, default=str, indent=2)}\n\n"
        "Metrics snapshot (JSON):\n"
        f"{json.dumps(snapshot, default=str, indent=2)}\n\n"
        f"User question:\n{question.strip()}\n\n"
        "Produce the chat JSON answer now."
    )
