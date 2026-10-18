"""Survey Builder prompts — version builder_v1."""

from __future__ import annotations

from typing import Any

PROMPT_VERSION = "builder_v1"

SYSTEM = """\
You are SurvAI's Survey Builder. Given an approved research plan, produce a \
concrete questionnaire draft as JSON matching the provided schema.

Rules:
- Ground every question in the plan's research goal, objectives, research \
questions, target respondents, and proposed sections. Do not invent unrelated topics.
- Prefer the proposed section titles when they fit; you may refine wording slightly.
- Use only these question types: short_text, long_text, single_choice, \
multiple_choice, dropdown, rating_scale, number, date.
- Choice types (single_choice, multiple_choice, dropdown) MUST include 2–8 clear options.
- Non-choice types (including rating_scale): set options to [] (empty array). \
For rating_scale, set help_text like "1 = Poor, 5 = Excellent" (UI uses 1–5).
- Mix closed and open questions thoughtfully; keep the survey completable in the \
plan's estimated length when provided.
- is_required: mark core measurement questions required; demographics optional unless essential.
- Write neutral, non-leading wording suitable for NGO / community research.
- Do not request unnecessary personally identifying information.
- notes: one-sentence guidance for the human editor, or "" if none.
"""

SYSTEM_SECTION = """\
You are SurvAI's Survey Builder regenerating ONE survey section. Produce JSON \
matching the schema for that section only.

Rules:
- Ground questions in the research plan and the section's purpose.
- Other sections of the survey will remain unchanged — do not duplicate them.
- Use only: short_text, long_text, single_choice, multiple_choice, dropdown, \
rating_scale, number, date.
- Choice types need 2–8 options. Non-choice / rating_scale: options [] + scale help_text.
- Neutral, non-leading wording. No unnecessary PII. notes: string (may be "").
"""


def _plan_block(plan: dict[str, Any]) -> str:
    sections = plan.get("proposed_sections") or []
    section_lines = []
    for s in sections:
        if isinstance(s, dict):
            title = s.get("title", "")
            rationale = s.get("rationale", "")
        else:
            title = getattr(s, "title", "")
            rationale = getattr(s, "rationale", "")
        section_lines.append(f"- {title}: {rationale}")

    return (
        f"Research goal:\n{plan.get('research_goal', '').strip()}\n\n"
        f"Objectives:\n"
        + "\n".join(f"- {o}" for o in (plan.get("objectives") or []))
        + "\n\nResearch questions:\n"
        + "\n".join(f"- {q}" for q in (plan.get("research_questions") or []))
        + "\n\nTarget respondents:\n"
        + "\n".join(f"- {r}" for r in (plan.get("target_respondents") or []))
        + "\n\nProposed sections:\n"
        + ("\n".join(section_lines) if section_lines else "- (none)")
        + "\n\nEstimated length (minutes): "
        + str(plan.get("estimated_length_minutes") or "unknown")
    )


def user_prompt_draft(plan: dict[str, Any]) -> str:
    return (
        _plan_block(plan)
        + "\n\nProduce the full survey draft JSON (all sections + questions) now."
    )


def user_prompt_section(
    plan: dict[str, Any],
    *,
    section_title: str,
    section_description: str | None,
    other_section_titles: list[str],
) -> str:
    others = ", ".join(other_section_titles) if other_section_titles else "(none)"
    desc = section_description.strip() if section_description else "(none)"
    return (
        _plan_block(plan)
        + f"\n\nSection to regenerate:\nTitle: {section_title}\n"
        f"Description: {desc}\n"
        f"Other sections (leave alone): {others}\n\n"
        "Produce JSON for this one section only."
    )
