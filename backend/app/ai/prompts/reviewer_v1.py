"""Survey Reviewer prompts — version reviewer_v1 (REV-01–06)."""

from __future__ import annotations

from typing import Any

PROMPT_VERSION = "reviewer_v1"

SYSTEM = """\
You are SurvAI's Survey Reviewer. Given a research plan and a questionnaire \
draft, produce a quality review as JSON matching the provided schema.

Rules:
- Findings are advisory only — never claim certification or approval.
- Flag real issues: leading_wording, double_barreled, ambiguous, \
objective_misalignment, or other.
- Every finding needs a clear explanation and a concrete suggested_rewrite \
(or "" if none).
- Use question_id exactly as provided in the questionnaire (UUID strings). \
If a finding is survey-wide, set question_id to "".
- score_criteria: 4–6 criteria with label, score (1.0–5.0), and short description.
- overall_quality_score: weighted sense of overall quality (1.0–5.0), advisory.
- estimated_completion_minutes: realistic completion time for this instrument.
- required_question_count: count of questions marked required in the input.
- Prefer precision over volume — 0–12 findings. Empty findings list is OK if \
the draft is solid.
- notes: one-sentence editor guidance, or "".
"""


def _plan_block(plan: dict[str, Any] | None) -> str:
    if not plan:
        return "Research plan: (none linked)\n"
    return (
        f"Research goal:\n{str(plan.get('research_goal') or '').strip()}\n\n"
        "Objectives:\n"
        + "\n".join(f"- {o}" for o in (plan.get("objectives") or []))
        + "\n\nResearch questions:\n"
        + "\n".join(f"- {q}" for q in (plan.get("research_questions") or []))
        + "\n\nTarget respondents:\n"
        + "\n".join(f"- {r}" for r in (plan.get("target_respondents") or []))
    )


def _questionnaire_block(survey: dict[str, Any]) -> str:
    lines: list[str] = [
        f"Survey title: {survey.get('title') or ''}",
        f"Required question count (input): {survey.get('required_question_count', 0)}",
        "",
    ]
    for section in survey.get("sections") or []:
        lines.append(f"## Section: {section.get('title') or ''}")
        for q in section.get("questions") or []:
            req = "required" if q.get("is_required") else "optional"
            lines.append(
                f"- [{q.get('id')}] ({q.get('type')}, {req}) {q.get('prompt_text')}"
            )
            opts = q.get("options") or []
            if opts:
                labels = [
                    o.get("label") if isinstance(o, dict) else str(o) for o in opts
                ]
                lines.append(f"  options: {', '.join(str(x) for x in labels)}")
        lines.append("")
    return "\n".join(lines)


def user_prompt_review(
    *,
    plan: dict[str, Any] | None,
    survey: dict[str, Any],
) -> str:
    return (
        _plan_block(plan)
        + "\n\nQuestionnaire:\n"
        + _questionnaire_block(survey)
        + "\nProduce the full reviewer JSON now."
    )
