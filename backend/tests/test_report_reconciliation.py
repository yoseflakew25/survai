"""§9 reconciliation fixtures — grounded report + chat."""

from __future__ import annotations

from app.ai.reconciliation import (
    reconcile_chat,
    reconcile_report,
    strip_ungrounded_statements,
    ungrounded_numbers_in_text,
)
from app.ai.schemas import (
    GroundedStatement,
    ReportChatOutput,
    ReportGenerationOutput,
    ReportSectionAI,
)


def _section(*pairs: tuple[str, str]) -> ReportSectionAI:
    return ReportSectionAI(
        heading="Section",
        statements=[
            GroundedStatement(text=text, metric_ref=ref) for text, ref in pairs
        ],
    )


def _full_report(**kwargs: ReportSectionAI) -> ReportGenerationOutput:
    empty = _section()
    fields = {name: empty for name in ReportGenerationOutput.model_fields}
    fields.update(kwargs)
    return ReportGenerationOutput(**fields)


METRICS = [
    {"key": "total_responses", "label": "Total", "value": 42, "unit": "count"},
    {"key": "completion_rate", "label": "Rate", "value": 80.0, "unit": "percent"},
]


def test_reconcile_accepts_matching_numbers() -> None:
    report = _full_report(
        executive_summary=_section(
            ("We collected 42 responses.", "total_responses"),
            ("Completion was 80%.", "completion_rate"),
        )
    )
    assert reconcile_report(report, METRICS) == []


def test_reconcile_flags_ungrounded_digits() -> None:
    report = _full_report(
        key_findings=_section(("About 99% love the product.", ""))
    )
    violations = reconcile_report(report, METRICS)
    assert any("Ungrounded" in v for v in violations)


def test_reconcile_flags_unknown_metric_ref() -> None:
    report = _full_report(
        methodology=_section(("n=42", "missing_key"))
    )
    violations = reconcile_report(report, METRICS)
    assert any("not in snapshot" in v for v in violations)


def test_strip_ungrounded_statements() -> None:
    report = _full_report(
        recommendations=_section(
            ("Keep this grounded prose without invented stats.", ""),
            ("Invented figure of 999 users.", ""),
        )
    )
    cleaned = strip_ungrounded_statements(report, METRICS)
    texts = [s.text for s in cleaned.recommendations.statements]
    assert texts == ["Keep this grounded prose without invented stats."]
    assert not any("Insufficient grounded data" in t for t in texts)


def test_strip_ungrounded_section_fallback_when_all_bad() -> None:
    report = _full_report(
        conclusion=_section(("Invented figure of 999 users.", ""))
    )
    cleaned = strip_ungrounded_statements(report, METRICS)
    assert len(cleaned.conclusion.statements) == 1
    assert "metrics snapshot" in cleaned.conclusion.statements[0].text.lower()


def test_chat_reconcile_grounded() -> None:
    out = ReportChatOutput(
        answer="There were 42 responses.",
        metric_refs=["total_responses"],
        confidence="grounded",
    )
    assert reconcile_chat(out, METRICS) == []


def test_chat_reconcile_rejects_invented_ref() -> None:
    out = ReportChatOutput(
        answer="There were 42 responses.",
        metric_refs=["nope"],
        confidence="grounded",
    )
    assert any("not in snapshot" in v for v in reconcile_chat(out, METRICS))


def test_edit_prose_rejects_numbers_not_in_snapshot() -> None:
    bad = ungrounded_numbers_in_text(
        "We somehow reached 999 respondents at 12% completion.",
        METRICS,
    )
    assert "999" in bad


def test_edit_prose_allows_snapshot_numbers() -> None:
    bad = ungrounded_numbers_in_text(
        "We collected 42 responses with an 80% completion rate.",
        METRICS,
    )
    assert bad == []
