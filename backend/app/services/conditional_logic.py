"""Skip / branch evaluation for survey questions (mirrors FE util)."""

from __future__ import annotations

from typing import Any


def normalize_conditional_logic(raw: Any) -> dict[str, Any] | None:
    if not isinstance(raw, dict):
        return None
    operator = "OR" if raw.get("operator") == "OR" else "AND"
    rules_out: list[dict[str, Any]] = []
    for item in raw.get("rules") or []:
        if not isinstance(item, dict):
            continue
        qid = str(item.get("question_id") or item.get("questionId") or "").strip()
        if not qid:
            continue
        rules_out.append(
            {
                "question_id": qid,
                "op": str(item.get("op") or "eq"),
                "value": item.get("value"),
            }
        )
    if not rules_out:
        return None
    return {"operator": operator, "rules": rules_out}


def _as_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str) and value.strip():
        try:
            return float(value)
        except ValueError:
            return None
    return None


def _equals(a: Any, b: Any) -> bool:
    an, bn = _as_number(a), _as_number(b)
    if an is not None and bn is not None:
        return an == bn
    return str(a) == str(b)


def _between_bounds(value: Any) -> tuple[float, float] | None:
    if isinstance(value, (list, tuple)) and len(value) >= 2:
        lo, hi = _as_number(value[0]), _as_number(value[1])
        if lo is None or hi is None:
            return None
        return (min(lo, hi), max(lo, hi))
    if isinstance(value, str) and "," in value:
        a, b = value.split(",", 1)
        lo, hi = _as_number(a), _as_number(b)
        if lo is None or hi is None:
            return None
        return (min(lo, hi), max(lo, hi))
    return None


def rule_matches(rule: dict[str, Any], answers: dict[str, Any]) -> bool:
    qid = str(rule.get("question_id") or "")
    current = answers.get(qid)
    if current is None:
        return False
    if isinstance(current, str) and not current.strip():
        return False
    if isinstance(current, list) and len(current) == 0:
        return False

    op = str(rule.get("op") or "eq")
    value = rule.get("value")

    if op == "eq":
        if isinstance(current, list):
            return any(_equals(v, value) for v in current)
        return _equals(current, value)
    if op == "neq":
        if isinstance(current, list):
            return not any(_equals(v, value) for v in current)
        return not _equals(current, value)
    if op == "gt":
        cur, rhs = _as_number(current), _as_number(value)
        return cur is not None and rhs is not None and cur > rhs
    if op == "lt":
        cur, rhs = _as_number(current), _as_number(value)
        return cur is not None and rhs is not None and cur < rhs
    if op == "contains":
        return isinstance(current, str) and str(value).lower() in current.lower()
    if op == "between":
        cur = _as_number(current)
        bounds = _between_bounds(value)
        return cur is not None and bounds is not None and bounds[0] <= cur <= bounds[1]
    return False


def condition_is_active(logic: Any, answers: dict[str, Any]) -> bool:
    """True when the question should be shown / required.

    Missing or empty logic ⇒ always active (visible).
    """
    normalized = normalize_conditional_logic(logic)
    if normalized is None:
        return True
    results = [rule_matches(r, answers) for r in normalized["rules"]]
    if normalized["operator"] == "AND":
        return all(results)
    return any(results)
