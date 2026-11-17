"""Notification message catalogs — key + params, rendered by ui_locale."""

from __future__ import annotations

from typing import Any

from app.core.i18n import normalize_locale

# message_key → locale → (title_template, body_template)
# Templates use str.format_map with params (survey_title, response_count, delta, detail).
_CATALOG: dict[str, dict[str, tuple[str, str]]] = {
    "survey_published": {
        "en": (
            'Survey "{survey_title}" is live',
            "Collection is open. Share the public link or QR code "
            "to start receiving responses.",
        ),
        "am": (
            'ዳሰሳ "{survey_title}" ንቁ ነው',
            "መረጃ መሰብሰብ ተከፍቷል። ምላሾችን ለመቀበል የህዝብ አገናኝ ወይም QR ኮድ ያጋሩ።",
        ),
    },
    "survey_closed": {
        "en": (
            'Collection closed for "{survey_title}"',
            "New responses are no longer accepted. Review analytics or generate a report.",
        ),
        "am": (
            'ለ "{survey_title}" መረጃ መሰብሰብ ተዘግቷል',
            "አዲስ ምላሾች አይቀበሉም። ትንታኔን ይገምግሙ ወይም ሪፖርት ይፍጠሩ።",
        ),
    },
    "response_received": {
        "en": (
            'New response for "{survey_title}"',
            "Total completed responses: {response_count}.",
        ),
        "am": (
            'ለ "{survey_title}" አዲስ ምላሽ',
            "ጠቅላላ የተጠናቀቁ ምላሾች: {response_count}።",
        ),
    },
    "response_milestone": {
        "en": (
            '{response_count} response{plural} for "{survey_title}"',
            "You hit a collection milestone. Keep sharing the survey link.",
        ),
        "am": (
            'ለ "{survey_title}" {response_count} ምላሽ(ዎች)',
            "የመሰብሰብ ደረጃ ላይ ደርሰዋል። የዳሰሳ አገናኙን ማጋራትዎን ይቀጥሉ።",
        ),
    },
    "response_digest": {
        "en": (
            '{delta} new responses for "{survey_title}"',
            "Total completed responses: {response_count}.",
        ),
        "am": (
            'ለ "{survey_title}" {delta} አዲስ ምላሾች',
            "ጠቅላላ የተጠናቀቁ ምላሾች: {response_count}።",
        ),
    },
    "review_complete": {
        "en": (
            'AI review ready for "{survey_title}"',
            "Open Review to see suggested improvements before you publish.",
        ),
        "am": (
            'ለ "{survey_title}" የAI ግምገማ ዝግጁ ነው',
            "ከማተምዎ በፊት የተጠቆሙ ማሻሻያዎችን ለማየት ግምገማን ይክፈቱ።",
        ),
    },
    "report_ready": {
        "en": (
            'Report ready for "{survey_title}"',
            "Your grounded narrative report is ready to review and export.",
        ),
        "am": (
            'ለ "{survey_title}" ሪፖርት ዝግጁ ነው',
            "መሰረታዊ የትረካ ሪፖርትዎ ለመገምገም እና ለመላክ ዝግጁ ነው።",
        ),
    },
    "report_failed": {
        "en": (
            'Report failed for "{survey_title}"',
            "Report generation failed. Open the survey and try again.{detail_suffix}",
        ),
        "am": (
            'ለ "{survey_title}" ሪፖርት አልተሳካም',
            "ሪፖርት መፍጠር አልተሳካም። ዳሰሳውን ይክፈቱ እና እንደገና ይሞክሩ።{detail_suffix}",
        ),
    },
}


def render_notification(
    message_key: str,
    *,
    locale: str | None,
    params: dict[str, Any] | None = None,
) -> tuple[str, str] | None:
    """Return (title, body) for key+locale, or None if unknown key."""
    entry = _CATALOG.get(message_key)
    if not entry:
        return None
    lang = normalize_locale(locale)
    templates = entry.get(lang) or entry["en"]
    safe: dict[str, Any] = {
        "survey_title": "",
        "response_count": 0,
        "delta": 0,
        "plural": "",
        "detail_suffix": "",
        **(params or {}),
    }
    count = int(safe.get("response_count") or 0)
    if "plural" not in (params or {}):
        safe["plural"] = "s" if count != 1 else ""
    detail = str(safe.get("detail") or "").strip()
    if detail and not safe.get("detail_suffix"):
        safe["detail_suffix"] = f" ({detail[:180]})"
    try:
        title = templates[0].format_map(safe)
        body = templates[1].format_map(safe)
    except (KeyError, ValueError):
        title = templates[0]
        body = templates[1]
    return title, body
