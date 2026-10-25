"""Pure analytics functions over in-memory response frames (plan.md §10).

Same input rows → same outputs. Never imports the AI layer.
Percent denominators are always **valid (non-missing) responses** for that
question unless noted otherwise.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
from uuid import UUID


CATEGORICAL_TYPES = frozenset(
    {"single_choice", "multiple_choice", "dropdown", "rating_scale"}
)
NUMERIC_TYPES = frozenset({"number", "rating_scale"})


@dataclass(frozen=True)
class SnapshotQuestion:
    id: UUID
    type: str
    prompt_text: str
    options: tuple[tuple[str, str], ...]  # (value, label)
    validation_min: float | None = None
    validation_max: float | None = None


@dataclass
class AnalyticsFrame:
    """In-memory frame for one survey_version_id."""

    survey_id: UUID
    survey_version_id: UUID
    started_count: int
    completed_count: int
    # respondent_id → question_id → answer_value (only completed respondents)
    answers: dict[UUID, dict[UUID, Any]] = field(default_factory=dict)
    # minutes between started_at and completed_at for completed respondents
    completion_minutes: list[float] = field(default_factory=list)
    questions: dict[UUID, SnapshotQuestion] = field(default_factory=dict)


@dataclass(frozen=True)
class DistributionBucket:
    label: str
    value: int
    percent: float


@dataclass(frozen=True)
class QuestionDistributionResult:
    question_id: UUID
    question_text: str
    question_type: str
    total_responses: int  # valid (non-missing) respondents
    missing_count: int
    buckets: tuple[DistributionBucket, ...]
    denominator: str = "valid_responses"


@dataclass(frozen=True)
class CrossTabCell:
    row_label: str
    col_label: str
    count: int
    percent: float  # row percent (of row total)


@dataclass(frozen=True)
class CrossTabResult:
    question_a_id: UUID
    question_a_text: str
    question_b_id: UUID
    question_b_text: str
    row_labels: tuple[str, ...]
    col_labels: tuple[str, ...]
    cells: tuple[CrossTabCell, ...]
    total_responses: int


def response_count(frame: AnalyticsFrame) -> int:
    """Completed respondents for this version."""
    return frame.completed_count


def completion_rate(frame: AnalyticsFrame) -> float:
    """completed / started * 100. Returns 0.0 when none started."""
    if frame.started_count <= 0:
        return 0.0
    return round(100.0 * frame.completed_count / frame.started_count, 1)


def avg_completion_minutes(frame: AnalyticsFrame) -> float | None:
    if not frame.completion_minutes:
        return None
    return round(sum(frame.completion_minutes) / len(frame.completion_minutes), 1)


def median_completion_minutes(frame: AnalyticsFrame) -> float | None:
    if not frame.completion_minutes:
        return None
    vals = sorted(frame.completion_minutes)
    n = len(vals)
    mid = n // 2
    if n % 2 == 1:
        return round(vals[mid], 1)
    return round((vals[mid - 1] + vals[mid]) / 2.0, 1)


def _is_missing(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str) and value.strip() == "":
        return True
    if isinstance(value, list) and len(value) == 0:
        return True
    return False


def _option_label_map(q: SnapshotQuestion) -> dict[str, str]:
    return {value: label for value, label in q.options}


def _rating_labels(q: SnapshotQuestion) -> list[tuple[str, str]]:
    lo = int(q.validation_min if q.validation_min is not None else 1)
    hi = int(q.validation_max if q.validation_max is not None else 5)
    if hi < lo:
        lo, hi = hi, lo
    out: list[tuple[str, str]] = []
    for n in range(lo, hi + 1):
        if n == lo:
            label = f"{n} (Poor)" if lo == 1 and hi == 5 else str(n)
        elif n == hi:
            label = f"{n} (Excellent)" if lo == 1 and hi == 5 else str(n)
        else:
            label = str(n)
        out.append((str(n), label))
    return out


def percent_distribution(
    frame: AnalyticsFrame, question_id: UUID
) -> QuestionDistributionResult:
    q = frame.questions.get(question_id)
    if q is None:
        raise KeyError(f"question {question_id} not in snapshot")

    completed_ids = list(frame.answers.keys())
    n_completed = len(completed_ids)

    values: list[Any] = []
    missing = 0
    for rid in completed_ids:
        raw = frame.answers[rid].get(question_id)
        if _is_missing(raw):
            missing += 1
        else:
            values.append(raw)

    valid = len(values)
    buckets: list[DistributionBucket] = []

    if q.type in {"single_choice", "dropdown"}:
        labels = _option_label_map(q)
        counts: Counter[str] = Counter()
        for v in values:
            counts[str(v)] += 1
        ordered = [opt[0] for opt in q.options] or sorted(counts.keys())
        for value_key in ordered:
            c = counts.get(value_key, 0)
            pct = round(100.0 * c / valid, 1) if valid else 0.0
            buckets.append(
                DistributionBucket(
                    label=labels.get(value_key, value_key),
                    value=c,
                    percent=pct,
                )
            )
    elif q.type == "multiple_choice":
        labels = _option_label_map(q)
        counts = Counter()
        for v in values:
            if isinstance(v, list):
                for item in v:
                    counts[str(item)] += 1
            else:
                counts[str(v)] += 1
        ordered = [opt[0] for opt in q.options] or sorted(counts.keys())
        for value_key in ordered:
            c = counts.get(value_key, 0)
            # Multi-select: % of respondents who selected this option (valid base)
            pct = round(100.0 * c / valid, 1) if valid else 0.0
            buckets.append(
                DistributionBucket(
                    label=labels.get(value_key, value_key),
                    value=c,
                    percent=pct,
                )
            )
    elif q.type == "rating_scale":
        scale = _rating_labels(q)
        counts = Counter()
        for v in values:
            # normalize 1.0 → "1"
            if isinstance(v, (int, float)):
                key = str(int(v)) if float(v).is_integer() else str(v)
            else:
                key = str(v)
            counts[key] += 1
        for value_key, label in scale:
            c = counts.get(value_key, 0)
            pct = round(100.0 * c / valid, 1) if valid else 0.0
            buckets.append(DistributionBucket(label=label, value=c, percent=pct))
    else:
        # Text / number / date — single "answered" bucket for overview
        c = valid
        pct = 100.0 if valid else 0.0
        buckets.append(
            DistributionBucket(label="Answered", value=c, percent=pct)
        )

    # If snapshot said n_completed but we never stored empty rows, treat
    # missing as completed − valid when answers dict omits the key.
    if missing == 0 and valid < n_completed:
        missing = n_completed - valid

    return QuestionDistributionResult(
        question_id=question_id,
        question_text=q.prompt_text,
        question_type=q.type,
        total_responses=valid,
        missing_count=missing,
        buckets=tuple(buckets),
    )


def _scalar_choice_label(q: SnapshotQuestion, raw: Any) -> str | None:
    if _is_missing(raw):
        return None
    if q.type == "multiple_choice":
        return None  # not used as a single crosstab axis without explode
    if q.type == "rating_scale":
        if isinstance(raw, (int, float)):
            key = str(int(raw)) if float(raw).is_integer() else str(raw)
        else:
            key = str(raw)
        for value, label in _rating_labels(q):
            if value == key:
                return label
        return key
    labels = _option_label_map(q)
    key = str(raw)
    return labels.get(key, key)


def cross_tab(
    frame: AnalyticsFrame, question_a_id: UUID, question_b_id: UUID
) -> CrossTabResult:
    qa = frame.questions.get(question_a_id)
    qb = frame.questions.get(question_b_id)
    if qa is None or qb is None:
        raise KeyError("both questions must exist in the snapshot")
    if qa.type == "multiple_choice" or qb.type == "multiple_choice":
        raise ValueError("cross_tab does not support multiple_choice axes in MVP")

    pair_counts: Counter[tuple[str, str]] = Counter()
    row_totals: Counter[str] = Counter()
    row_order: list[str] = []
    col_order: list[str] = []

    def _axis_labels(q: SnapshotQuestion) -> list[str]:
        if q.type == "rating_scale":
            return [label for _, label in _rating_labels(q)]
        return [label for _, label in q.options]

    row_order = _axis_labels(qa)
    col_order = _axis_labels(qb)

    n_pairs = 0
    for _rid, answers in frame.answers.items():
        ra = _scalar_choice_label(qa, answers.get(question_a_id))
        rb = _scalar_choice_label(qb, answers.get(question_b_id))
        if ra is None or rb is None:
            continue
        pair_counts[(ra, rb)] += 1
        row_totals[ra] += 1
        n_pairs += 1
        if ra not in row_order:
            row_order.append(ra)
        if rb not in col_order:
            col_order.append(rb)

    cells: list[CrossTabCell] = []
    for row in row_order:
        rt = row_totals.get(row, 0)
        for col in col_order:
            c = pair_counts.get((row, col), 0)
            pct = round(100.0 * c / rt, 1) if rt else 0.0
            cells.append(
                CrossTabCell(row_label=row, col_label=col, count=c, percent=pct)
            )

    return CrossTabResult(
        question_a_id=question_a_id,
        question_a_text=qa.prompt_text,
        question_b_id=question_b_id,
        question_b_text=qb.prompt_text,
        row_labels=tuple(row_order),
        col_labels=tuple(col_order),
        cells=tuple(cells),
        total_responses=n_pairs,
    )


def questions_from_snapshot(snapshot: Mapping[str, Any]) -> dict[UUID, SnapshotQuestion]:
    out: dict[UUID, SnapshotQuestion] = {}
    for section in snapshot.get("sections") or []:
        for raw in section.get("questions") or []:
            qid = UUID(str(raw["id"]))
            opts_raw = raw.get("options") or []
            options: list[tuple[str, str]] = []
            for opt in opts_raw:
                if isinstance(opt, dict):
                    value = str(opt.get("value") or opt.get("id") or "")
                    label = str(opt.get("label") or value)
                    if value:
                        options.append((value, label))
                else:
                    s = str(opt)
                    options.append((s, s))
            rules = raw.get("validation_rules") or {}
            vmin = rules.get("min") if isinstance(rules, dict) else None
            vmax = rules.get("max") if isinstance(rules, dict) else None
            out[qid] = SnapshotQuestion(
                id=qid,
                type=str(raw.get("type") or "short_text"),
                prompt_text=str(raw.get("prompt_text") or ""),
                options=tuple(options),
                validation_min=float(vmin) if vmin is not None else None,
                validation_max=float(vmax) if vmax is not None else None,
            )
    return out


def minutes_between(started: datetime, completed: datetime) -> float:
    delta = completed - started
    return max(delta.total_seconds() / 60.0, 0.0)


def distribution_question_ids(
    questions: Mapping[UUID, SnapshotQuestion],
    *,
    only: Sequence[UUID] | None = None,
) -> list[UUID]:
    """Default: categorical + rating questions in snapshot order."""
    ids = list(questions.keys()) if only is None else list(only)
    return [
        qid
        for qid in ids
        if qid in questions and questions[qid].type in CATEGORICAL_TYPES
    ]
