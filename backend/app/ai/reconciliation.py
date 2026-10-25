"""§9 anti-hallucination — reconcile grounded statements against metrics."""

from __future__ import annotations

import re
from typing import Any

from app.ai.schemas import (
    GroundedStatement,
    ReportChatOutput,
    ReportGenerationOutput,
    ReportSectionAI,
)

_DIGIT_RE = re.compile(r"\d")
_NUMBER_RE = re.compile(r"-?\d+(?:\.\d+)?")


def _contains_digit(text: str) -> bool:
    return bool(_DIGIT_RE.search(text or ""))


def _numeric_claim_matches(text: str, value: Any) -> bool:
    """True if any number in text reasonably matches the metric value."""
    nums = _NUMBER_RE.findall(text or "")
    if not nums:
        return True
    try:
        target = float(value)
    except (TypeError, ValueError):
        # Non-numeric metric — require the string form somewhere
        return str(value) in text
    for raw in nums:
        try:
            n = float(raw)
        except ValueError:
            continue
        if abs(n - target) < 0.05 or abs(n - target) / max(abs(target), 1e-9) < 0.02:
            return True
        # Percent shown as 0–100 while metric is 0–1
        if 0 <= target <= 1 and abs(n - target * 100) < 0.6:
            return True
    return False


def _metric_values(metrics: list[dict[str, Any]]) -> list[Any]:
    return [m.get("value") for m in metrics if "value" in m]


def number_matches_any_metric(raw: str, metrics: list[dict[str, Any]]) -> bool:
    """True if this numeric token is consistent with at least one snapshot metric."""
    return any(
        _numeric_claim_matches(raw, value) for value in _metric_values(metrics)
    )


def ungrounded_numbers_in_text(
    text: str, metrics: list[dict[str, Any]]
) -> list[str]:
    """Numbers in free-form edited prose that do not appear in the snapshot."""
    bad: list[str] = []
    for raw in _NUMBER_RE.findall(text or ""):
        if not number_matches_any_metric(raw, metrics):
            bad.append(raw)
    # de-dupe preserving order
    return list(dict.fromkeys(bad))


def reconcile_statements(
    statements: list[GroundedStatement],
    metrics: list[dict[str, Any]],
) -> list[str]:
    metrics_by_key = {str(m.get("key")): m for m in metrics if m.get("key")}
    violations: list[str] = []
    for s in statements:
        ref = (s.metric_ref or "").strip()
        if not ref:
            if _contains_digit(s.text):
                violations.append(f"Ungrounded numeric claim: {s.text!r}")
            continue
        metric = metrics_by_key.get(ref)
        if metric is None:
            violations.append(f"metric_ref {ref!r} not in snapshot")
        elif not _numeric_claim_matches(s.text, metric.get("value")):
            violations.append(
                f"Stated value in {s.text!r} does not match {metric.get('value')!r}"
            )
    return violations


def _section_fields(output: ReportGenerationOutput) -> list[tuple[str, ReportSectionAI]]:
    out: list[tuple[str, ReportSectionAI]] = []
    for name in ReportGenerationOutput.model_fields:
        sec = getattr(output, name)
        if isinstance(sec, ReportSectionAI):
            out.append((name, sec))
    return out


def all_statements(output: ReportGenerationOutput) -> list[GroundedStatement]:
    out: list[GroundedStatement] = []
    for _, sec in _section_fields(output):
        out.extend(sec.statements or [])
    return out


def reconcile_report(
    output: ReportGenerationOutput, metrics: list[dict[str, Any]]
) -> list[str]:
    return reconcile_statements(all_statements(output), metrics)


def reconcile_chat(
    output: ReportChatOutput, metrics: list[dict[str, Any]]
) -> list[str]:
    metrics_by_key = {str(m.get("key")) for m in metrics if m.get("key")}
    violations: list[str] = []
    for ref in output.metric_refs or []:
        if ref and ref not in metrics_by_key:
            violations.append(f"metric_ref {ref!r} not in snapshot")
    if _contains_digit(output.answer):
        if not (output.metric_refs or []):
            if output.confidence != "insufficient_data":
                violations.append(
                    f"Ungrounded numeric claim in chat: {output.answer!r}"
                )
        else:
            ok = False
            for ref in output.metric_refs:
                metric = next(
                    (m for m in metrics if str(m.get("key")) == ref), None
                )
                if metric and _numeric_claim_matches(
                    output.answer, metric.get("value")
                ):
                    ok = True
                    break
            if not ok and output.confidence == "grounded":
                violations.append(
                    f"Chat answer numbers do not match cited metrics: {output.answer!r}"
                )
    return violations


def strip_ungrounded_statements(
    output: ReportGenerationOutput, metrics: list[dict[str, Any]]
) -> ReportGenerationOutput:
    """Replace violating statements with a safe placeholder (post-retry fallback)."""
    metrics_by_key = {str(m.get("key")): m for m in metrics if m.get("key")}

    def _clean(statements: list[GroundedStatement]) -> list[GroundedStatement]:
        cleaned: list[GroundedStatement] = []
        for s in statements:
            bad = reconcile_statements([s], list(metrics_by_key.values()))
            if bad:
                cleaned.append(
                    GroundedStatement(
                        text="Insufficient grounded data for this claim.",
                        metric_ref="",
                    )
                )
            else:
                cleaned.append(s)
        return cleaned

    updates: dict[str, ReportSectionAI] = {}
    for name, sec in _section_fields(output):
        updates[name] = sec.model_copy(
            update={"statements": _clean(sec.statements)}
        )
    return output.model_copy(update=updates)
