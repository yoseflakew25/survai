"""Survey reviewer — Gemini mocked (REV-01–06)."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.ai.schemas import (
    DraftQuestion,
    DraftSection,
    ReviewerOutput,
    ReviewFindingItem,
    ReviewScoreCriterion,
    SurveyDraftOutput,
)


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": "Review Org",
        },
    )
    assert register.status_code == 201, register.text
    verify = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()


async def _seed_plan(client: AsyncClient, headers: dict) -> str:
    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={
            "research_goal": "Understand community health needs in rural districts."
        },
    )
    assert create.status_code == 201, create.text
    plan_id = create.json()["id"]
    patch = await client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=headers,
        json={
            "objectives": ["Map primary health concerns"],
            "research_questions": ["What conditions are most common?"],
            "target_respondents": ["Household heads aged 18-65"],
            "proposed_sections": [
                {"title": "Demographics", "rationale": "Baseline"},
            ],
            "estimated_length_minutes": 15,
        },
    )
    assert patch.status_code == 200, patch.text
    return plan_id


@pytest.mark.asyncio
async def test_review_run_latest_and_finding_status(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="reviewer@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    plan_id = await _seed_plan(client, headers)

    draft = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="Demographics",
                questions=[
                    DraftQuestion(
                        prompt_text="Don't you agree that clinics are underfunded?",
                        type="single_choice",
                        options=["Yes", "No"],
                        is_required=True,
                        help_text="",
                    )
                ],
            )
        ],
        notes="",
    )

    async def _fake_draft(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=draft,
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=10,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "Review Survey", "generate": True},
    )
    assert created.status_code == 201, created.text
    survey = created.json()["survey"]
    survey_id = survey["id"]
    question_id = survey["sections"][0]["questions"][0]["id"]

    latest_empty = await client.get(
        f"/api/v1/surveys/{survey_id}/review/latest",
        headers=headers,
    )
    assert latest_empty.status_code == 200, latest_empty.text
    assert latest_empty.json() is None

    review_out = ReviewerOutput(
        overall_quality_score=3.2,
        estimated_completion_minutes=8,
        required_question_count=1,
        score_criteria=[
            ReviewScoreCriterion(
                label="Objectivity",
                score=2.5,
                description="Leading phrasing detected",
            ),
            ReviewScoreCriterion(
                label="Clarity",
                score=4.0,
                description="Wording is otherwise clear",
            ),
        ],
        findings=[
            ReviewFindingItem(
                question_id=question_id,
                issue_type="leading_wording",
                explanation="Assumes agreement that clinics are underfunded.",
                suggested_rewrite="How would you rate clinic funding in your area?",
            )
        ],
        notes="Tighten leading questions before publish.",
    )

    async def _fake_review(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=review_out,
            model="gemini-test",
            prompt_version="reviewer_v1",
            request_id=str(uuid4()),
            latency_ms=15,
        )

    monkeypatch.setattr(
        "app.services.reviewer.review_survey",
        _fake_review,
    )

    run = await client.post(
        f"/api/v1/surveys/{survey_id}/review",
        headers=headers,
    )
    assert run.status_code == 200, run.text
    report = run.json()
    assert report["survey_id"] == survey_id
    assert report["overall_quality_score"] == 3.2
    assert report["estimated_completion_minutes"] == 8
    assert len(report["findings"]) == 1
    finding = report["findings"][0]
    assert finding["issue_type"] == "leading_wording"
    assert finding["question_id"] == question_id
    assert finding["status"] == "open"
    assert finding["question_text"]
    assert report["notes"] == "Tighten leading questions before publish."

    latest = await client.get(
        f"/api/v1/surveys/{survey_id}/review/latest",
        headers=headers,
    )
    assert latest.status_code == 200, latest.text
    assert latest.json()["id"] == report["id"]

    patched = await client.patch(
        f"/api/v1/reviewer-findings/{finding['id']}",
        headers=headers,
        json={"status": "dismissed"},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["status"] == "dismissed"

    latest2 = await client.get(
        f"/api/v1/surveys/{survey_id}/review/latest",
        headers=headers,
    )
    assert latest2.json()["findings"][0]["status"] == "dismissed"
    assert latest2.json()["notes"] == "Tighten leading questions before publish."

    # Regenerating the survey must clear prior advisory reviews.
    async def _fake_draft_again(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=draft,
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=10,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft_again,
    )
    regen = await client.post(
        f"/api/v1/surveys/{survey_id}/generate",
        headers=headers,
    )
    assert regen.status_code == 200, regen.text

    cleared = await client.get(
        f"/api/v1/surveys/{survey_id}/review/latest",
        headers=headers,
    )
    assert cleared.status_code == 200, cleared.text
    assert cleared.json() is None
