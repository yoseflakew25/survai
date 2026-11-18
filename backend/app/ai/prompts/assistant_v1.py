"""Org assistant prompts — RAG context + structured tool plan/answer."""

from __future__ import annotations

import json
from typing import Any, Literal

from pydantic import BaseModel, Field

PROMPT_VERSION = "assistant_v1_1"

SYSTEM_PLAN = """\
You are SurvAI's organization research assistant planner.
Given the organization's profile (CSO metadata), retrieved knowledge chunks, \
and the org survey catalog, decide which live analytics summaries, saved analysis \
views, and reports to fetch before answering.

Rules:
- Use organization_profile (mission, geography, programs, M&E practice, ethics) \
to pick surveys and reports that best match the user's question and this org's focus.
- Only request survey_ids / report_ids that appear in the provided context.
- Prefer analytics when the user asks about counts, rates, distributions, or comparisons.
- Prefer saved views when the user asks about a named filter set, saved analysis, or a subset view.
- Prefer reports when the user asks about narratives, findings, or recommendations.
- If the retrieved context is enough for a qualitative overview, leave lists empty.
"""

SYSTEM_ANSWER = """\
You are SurvAI's organization research assistant for one NGO/org workspace.
Answer using the organization_profile, retrieved knowledge chunks, and the \
structured tool payloads provided. Do not invent statistics.

Hard rules:
- Tailor suggestions and narrative to organization_profile: mission, target \
populations, geography, thematic areas, partners, M&E capacity, languages, and \
ethics / AI boundaries. Do not recommend actions that conflict with stated policies.
- Every number must come from tool analytics or a report metrics_snapshot.
- If data is missing, say so clearly and set confidence to insufficient_data.
- Prefer grounded when all numbers are cited; partial for qualitative-only answers.
- Keep answers concise. Prefer Markdown: short ## headings, \
bullet lists (- item), numbered lists (1. item), and **bold** for key terms.
- Cite chunk ids you relied on in citation_chunk_ids (include CSO profile chunks).
- Put metric keys or tool labels you used in metric_refs.
"""


class AssistantPlanOutput(BaseModel):
    survey_ids_for_analytics: list[str] = Field(default_factory=list)
    survey_ids_for_saved_views: list[str] = Field(default_factory=list)
    report_ids_to_open: list[str] = Field(default_factory=list)
    rationale: str = ""


class AssistantAnswerOutput(BaseModel):
    answer: str
    confidence: Literal["grounded", "partial", "insufficient_data"] = "partial"
    citation_chunk_ids: list[str] = Field(default_factory=list)
    metric_refs: list[str] = Field(default_factory=list)


def _compact(data: Any) -> str:
    return json.dumps(data, default=str, separators=(",", ":"), ensure_ascii=False)


def build_plan_user_prompt(
    *,
    question: str,
    chunks: list[dict[str, Any]],
    surveys: list[dict[str, Any]],
    history: list[dict[str, str]],
    organization_profile: dict[str, Any] | None = None,
) -> str:
    return _compact(
        {
            "question": question,
            "history": history[-6:],
            "organization_profile": organization_profile or {},
            "retrieved_chunks": chunks,
            "survey_catalog": surveys,
        }
    )


def build_answer_user_prompt(
    *,
    question: str,
    chunks: list[dict[str, Any]],
    tool_payload: dict[str, Any],
    history: list[dict[str, str]],
    organization_profile: dict[str, Any] | None = None,
) -> str:
    return _compact(
        {
            "question": question,
            "history": history[-6:],
            "organization_profile": organization_profile or {},
            "retrieved_chunks": chunks,
            "tool_payload": tool_payload,
        }
    )
