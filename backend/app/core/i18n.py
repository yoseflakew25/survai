"""Locale helpers — UI chrome vs survey content language."""

from __future__ import annotations

from typing import Literal

AppLocale = Literal["en", "am"]
SUPPORTED_LOCALES: frozenset[str] = frozenset({"en", "am"})
DEFAULT_LOCALE: AppLocale = "en"

_CONTENT_LANGUAGE_CLAUSE = {
    "en": (
        "CONTENT LANGUAGE (mandatory): English.\n"
        "Write every user-facing string in clear English suitable for NGO / "
        "community research (titles, goals, objectives, research questions, "
        "section titles, question prompts, answer options, rationales, "
        "assistant replies, report narratives, findings, notes). "
        "Keep JSON keys in English."
    ),
    "am": (
        "CONTENT LANGUAGE (mandatory): Amharic (አማርኛ / Geʽez Fidel).\n"
        "Write EVERY user-facing string in Amharic script — titles, goals, "
        "objectives, research questions, audiences, section titles, "
        "rationales, question prompts, answer options, help text, "
        "assistant_reply, research_goal_draft, brief fields, notes, "
        "report narratives, and findings.\n"
        "Do NOT use English prose in those fields (technical JSON keys and "
        "enum values like short_text stay English). If the user's input is "
        "English, still produce Amharic output. Prefer natural Ethiopian "
        "NGO / community research phrasing.\n"
        "Anti-loop (critical for Amharic): never repeat the same sentence or "
        "paragraph. Chat replies must stay short (2–4 sentences). "
        "Stop after one clear answer or question."
    ),
}


def normalize_locale(value: str | None, *, default: AppLocale = DEFAULT_LOCALE) -> AppLocale:
    if value and value.lower().strip() in SUPPORTED_LOCALES:
        return value.lower().strip()  # type: ignore[return-value]
    return default


def content_language_instruction(content_language: str | None) -> str:
    locale = normalize_locale(content_language)
    return _CONTENT_LANGUAGE_CLAUSE[locale]


def with_content_language(system: str, content_language: str | None) -> str:
    """Prepend the language rule so it outranks any generic wording guidance."""
    return f"{content_language_instruction(content_language)}\n\n{system.strip()}"
