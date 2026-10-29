"""Report chat prompt includes multi-turn history (RPT-04) and stays compact."""

from app.ai.prompts.chat_v1 import user_prompt_chat


def test_chat_prompt_includes_history_and_question() -> None:
    prompt = user_prompt_chat(
        question="What should donors know?",
        sections=[{"id": "executive_summary", "title": "Exec", "content": "Hi"}],
        snapshot={"response_count": 12, "metrics": [{"key": "n", "value": 12}]},
        history=[
            {"role": "user", "content": "Summarize findings"},
            {"role": "assistant", "content": "Key finding A."},
        ],
    )
    assert "Prior turns" in prompt
    assert "Summarize findings" in prompt
    assert "What should donors know?" in prompt
    assert "response_count" in prompt


def test_chat_prompt_omits_history_block_when_empty() -> None:
    prompt = user_prompt_chat(
        question="Hello",
        sections=[],
        snapshot={},
        history=None,
    )
    assert "Prior turns" not in prompt
    assert "Hello" in prompt


def test_chat_prompt_drops_distributions_and_truncates_sections() -> None:
    long_body = "x" * 2000
    prompt = user_prompt_chat(
        question="Top finding?",
        sections=[{"id": "a", "title": "A", "content": long_body}],
        snapshot={
            "response_count": 5,
            "distributions": [{"huge": True, "buckets": list(range(50))}],
            "metrics": [
                {
                    "key": "total_responses",
                    "label": "Total",
                    "value": 5,
                    "unit": "count",
                    "extra_ignored": "nope",
                }
            ],
        },
    )
    assert "distributions" not in prompt
    assert "extra_ignored" not in prompt
    assert long_body not in prompt
    assert "…" in prompt
    assert "total_responses" in prompt


def test_chat_prompt_prefers_priority_sections_and_caps_metrics() -> None:
    sections = [
        {"id": f"sec_{i}", "title": f"S{i}", "content": f"body {i}"}
        for i in range(12)
    ]
    sections[0] = {
        "id": "key_findings",
        "title": "Findings",
        "content": "Important finding text",
    }
    metrics = [{"key": f"q_{i}", "label": f"Q{i}", "value": i} for i in range(50)]
    metrics.insert(0, {"key": "total_responses", "label": "N", "value": 3})
    prompt = user_prompt_chat(
        question="Top?",
        sections=sections,
        snapshot={"response_count": 3, "metrics": metrics},
    )
    assert "key_findings" in prompt
    assert "Important finding" in prompt
    # Cap keeps prompt small — not all 50 metrics.
    assert prompt.count('"key":"q_') <= 24
    assert '"key":"total_responses"' in prompt
