"""Unit tests for deterministic analytics engine (no DB)."""

from __future__ import annotations

from uuid import uuid4

from app.analytics.engine import (
    AnalyticsFrame,
    SnapshotQuestion,
    completion_rate,
    cross_tab,
    percent_distribution,
    response_count,
)


def _frame_with_choice() -> tuple[AnalyticsFrame, object, object]:
    q_device = uuid4()
    q_rating = uuid4()
    survey_id = uuid4()
    version_id = uuid4()

    questions = {
        q_device: SnapshotQuestion(
            id=q_device,
            type="single_choice",
            prompt_text="Primary device?",
            options=(
                ("smartphone", "Smartphone"),
                ("feature", "Feature phone"),
                ("none", "None"),
            ),
        ),
        q_rating: SnapshotQuestion(
            id=q_rating,
            type="rating_scale",
            prompt_text="How useful?",
            options=(),
            validation_min=1,
            validation_max=5,
        ),
    }

    r1, r2, r3, r4 = uuid4(), uuid4(), uuid4(), uuid4()
    answers = {
        r1: {q_device: "smartphone", q_rating: 5},
        r2: {q_device: "smartphone", q_rating: 4},
        r3: {q_device: "feature", q_rating: 3},
        r4: {q_device: None, q_rating: 5},  # missing device
    }

    frame = AnalyticsFrame(
        survey_id=survey_id,
        survey_version_id=version_id,
        started_count=5,
        completed_count=4,
        answers=answers,
        completion_minutes=[10.0, 12.0, 8.0, 11.0],
        questions=questions,
    )
    return frame, q_device, q_rating


def test_response_count_and_completion_rate() -> None:
    frame, _, _ = _frame_with_choice()
    assert response_count(frame) == 4
    assert completion_rate(frame) == 80.0  # 4/5


def test_single_choice_distribution_denominator_is_valid() -> None:
    frame, q_device, _ = _frame_with_choice()
    dist = percent_distribution(frame, q_device)
    assert dist.total_responses == 3  # one missing
    assert dist.missing_count == 1
    by_label = {b.label: b for b in dist.buckets}
    assert by_label["Smartphone"].value == 2
    assert by_label["Smartphone"].percent == 66.7  # 2/3
    assert by_label["Feature phone"].value == 1
    assert by_label["Feature phone"].percent == 33.3
    assert by_label["None"].value == 0
    assert by_label["None"].percent == 0.0


def test_rating_scale_buckets() -> None:
    frame, _, q_rating = _frame_with_choice()
    dist = percent_distribution(frame, q_rating)
    assert dist.total_responses == 4
    assert dist.missing_count == 0
    by_label = {b.label: b for b in dist.buckets}
    assert by_label["5 (Excellent)"].value == 2
    assert by_label["5 (Excellent)"].percent == 50.0
    assert by_label["4"].value == 1
    assert by_label["3"].value == 1


def test_cross_tab_row_percent() -> None:
    frame, q_device, q_rating = _frame_with_choice()
    # Drop the missing-device respondent for cleaner pairs
    rid_missing = next(
        rid
        for rid, ans in frame.answers.items()
        if ans.get(q_device) is None
    )
    del frame.answers[rid_missing]
    frame.completed_count = 3

    result = cross_tab(frame, q_device, q_rating)
    assert result.total_responses == 3
    # Among smartphone (n=2): one rated 5, one rated 4 → 50% each
    smart_cells = [c for c in result.cells if c.row_label == "Smartphone"]
    by_col = {c.col_label: c for c in smart_cells}
    assert by_col["5 (Excellent)"].count == 1
    assert by_col["5 (Excellent)"].percent == 50.0
    assert by_col["4"].count == 1
    assert by_col["4"].percent == 50.0
