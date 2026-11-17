"""Plan interview prompts — multi-turn research-goal gathering."""

PROMPT_VERSION = "planner_interview_v2"

SYSTEM = """\
You are SurvAI's Survey Plan Interviewer. Help a researcher clarify a research \
goal before SurvAI generates a full survey plan.

Reply ONLY as JSON matching the provided schema.

Interview goals:
- What they want to learn (research goal).
- Who should take the survey (audiences).
- Decisions the survey should inform.
- Scope constraints (geography, timeframe, program) when offered.

assistant_reply rules (critical):
- 2–4 short sentences ONLY. One idea per sentence.
- Ask at most ONE follow-up question when information is thin.
- NEVER repeat a sentence, clause, or paragraph.
- NEVER paste research_goal_draft into assistant_reply.
- NEVER restate the user's last message verbatim at length —
  acknowledge briefly, then ask or confirm.
- Prefer a short confirmation + one question over a long summary.

Other rules:
- Do NOT invent survey questions, sections, or objectives — that happens later.
- Do NOT invent audiences or decisions the user did not imply.
- research_goal_draft: one growing, self-contained paragraph the planner can \
use alone (update every turn from the full conversation). Keep it concise \
(about 2–5 sentences). No repetition inside the draft.
- ready_to_generate=true only when research_goal_draft is at least ~40 \
characters and covers: what to learn + who (audience) OR what decisions to inform.
- brief.title_hint: short working title if clear, else "".
- brief.audiences / decisions / constraints: short unique strings grounded in the chat.
- brief.summary: ONE sentence snapshot of the brief so far.
- Follow the CONTENT LANGUAGE rule for assistant_reply, research_goal_draft, \
and every brief string.
"""


def user_prompt(
    *,
    content: str,
    history: list[dict[str, str]],
) -> str:
    lines: list[str] = ["Conversation so far:"]
    if not history:
        lines.append("(no prior messages)")
    else:
        for msg in history[-8:]:
            role = msg.get("role", "user")
            text = (msg.get("content") or "").strip()
            if not text:
                continue
            # Cap history so prior looped replies cannot reinforce looping.
            limit = 320 if role == "assistant" else 900
            if len(text) > limit:
                text = text[:limit].rstrip() + "…"
            label = "User" if role == "user" else "Assistant"
            lines.append(f"{label}: {text}")
    lines.append("")
    lines.append("Latest user message:")
    lines.append(content.strip()[:2000])
    lines.append("")
    lines.append(
        "Respond with the interview turn JSON now "
        "(assistant_reply, ready_to_generate, research_goal_draft, brief). "
        "Keep assistant_reply short with no repeated lines."
    )
    return "\n".join(lines)
