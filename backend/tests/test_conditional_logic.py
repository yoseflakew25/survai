"""Unit tests for skip / branch evaluation."""

from app.services.conditional_logic import condition_is_active, rule_matches


def test_condition_active_without_logic() -> None:
    assert condition_is_active(None, {}) is True
    assert condition_is_active({}, {"q1": "yes"}) is True


def test_eq_rule_snake_and_camel() -> None:
    answers = {"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": "yes"}
    snake = {
        "operator": "AND",
        "rules": [
            {
                "question_id": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "op": "eq",
                "value": "yes",
            }
        ],
    }
    camel = {
        "operator": "AND",
        "rules": [
            {
                "questionId": "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
                "op": "eq",
                "value": "yes",
            }
        ],
    }
    assert condition_is_active(snake, answers) is True
    assert condition_is_active(camel, answers) is True
    assert (
        condition_is_active(snake, {"aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee": "no"})
        is False
    )


def test_between_op() -> None:
    rule = {"question_id": "age", "op": "between", "value": [18, 30]}
    assert rule_matches(rule, {"age": 21}) is True
    assert rule_matches(rule, {"age": 17}) is False
    assert (
        rule_matches(
            {"question_id": "age", "op": "between", "value": "18,30"},
            {"age": "25"},
        )
        is True
    )


def test_or_operator() -> None:
    logic = {
        "operator": "OR",
        "rules": [
            {"question_id": "q1", "op": "eq", "value": "a"},
            {"question_id": "q1", "op": "eq", "value": "b"},
        ],
    }
    assert condition_is_active(logic, {"q1": "b"}) is True
    assert condition_is_active(logic, {"q1": "c"}) is False
