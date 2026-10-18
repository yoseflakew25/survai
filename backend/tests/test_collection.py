"""Publish + public collection (COL-01–05), Gemini mocked for builder."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.ai.schemas import DraftQuestion, DraftSection, SurveyDraftOutput


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": "Collect Org",
        },
    )
    assert register.status_code == 201, register.text
    verify = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()


async def _seed_survey_with_questions(
    client: AsyncClient,
    headers: dict,
    monkeypatch: pytest.MonkeyPatch,
) -> str:
    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={"research_goal": "Measure clinic wait times."},
    )
    assert create.status_code == 201, create.text
    plan_id = create.json()["id"]
    patch = await client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=headers,
        json={
            "objectives": ["Track wait times"],
            "research_questions": ["How long do patients wait?"],
            "target_respondents": ["Patients"],
            "proposed_sections": [{"title": "Visit", "rationale": "Timing"}],
            "estimated_length_minutes": 5,
        },
    )
    assert patch.status_code == 200, patch.text

    draft = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="Visit",
                questions=[
                    DraftQuestion(
                        prompt_text="How long did you wait?",
                        type="single_choice",
                        options=["Under 15 min", "15–30 min", "Over 30 min"],
                        is_required=True,
                        help_text="",
                    ),
                    DraftQuestion(
                        prompt_text="Any comments?",
                        type="long_text",
                        options=[],
                        is_required=False,
                        help_text="",
                    ),
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
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "Wait Times", "generate": True},
    )
    assert created.status_code == 201, created.text
    return created.json()["survey"]["id"]


@pytest.mark.asyncio
async def test_publish_public_respond_and_complete(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="collect@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey_with_questions(client, headers, monkeypatch)

    # Cannot publish via bare status PATCH
    bad = await client.patch(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
        json={"status": "published"},
    )
    assert bad.status_code == 400, bad.text

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text
    body = pub.json()
    version_id = body["version_id"]
    assert body["version_number"] == 1
    assert body["collection_path"] == f"/s/{version_id}"

    stats = await client.get(
        f"/api/v1/surveys/{survey_id}/collect-stats",
        headers=headers,
    )
    assert stats.status_code == 200, stats.text
    assert stats.json()["response_count"] == 0
    assert stats.json()["current_version_id"] == version_id

    public = await client.get(f"/api/v1/public/surveys/{version_id}")
    assert public.status_code == 200, public.text
    public_body = public.json()
    assert public_body["survey_version_id"] == version_id
    assert len(public_body["sections"]) == 1
    q_required = public_body["sections"][0]["questions"][0]
    q_optional = public_body["sections"][0]["questions"][1]
    assert q_required["is_required"] is True

    start = await client.post(
        f"/api/v1/public/surveys/{version_id}/respondents"
    )
    assert start.status_code == 200, start.text
    respondent = start.json()
    respondent_id = respondent["id"]
    session_token = respondent["session_token"]

    # Complete without required answer → 400
    incomplete = await client.post(
        f"/api/v1/public/respondents/{respondent_id}/complete",
        json={"session_token": session_token},
    )
    assert incomplete.status_code == 400, incomplete.text

    opt_value = q_required["options"][0]["value"]
    ans = await client.post(
        f"/api/v1/public/respondents/{respondent_id}/answers",
        json={
            "session_token": session_token,
            "question_id": q_required["id"],
            "value": opt_value,
        },
    )
    assert ans.status_code == 200, ans.text

    # Idempotent upsert
    ans2 = await client.post(
        f"/api/v1/public/respondents/{respondent_id}/answers",
        json={
            "session_token": session_token,
            "question_id": q_required["id"],
            "value": q_required["options"][1]["value"],
        },
    )
    assert ans2.status_code == 200, ans2.text

    await client.post(
        f"/api/v1/public/respondents/{respondent_id}/answers",
        json={
            "session_token": session_token,
            "question_id": q_optional["id"],
            "value": "Went fine",
        },
    )

    done = await client.post(
        f"/api/v1/public/respondents/{respondent_id}/complete",
        json={"session_token": session_token},
    )
    assert done.status_code == 200, done.text
    assert done.json()["completed_at"] is not None

    stats2 = await client.get(
        f"/api/v1/surveys/{survey_id}/collect-stats",
        headers=headers,
    )
    assert stats2.json()["response_count"] == 1

    closed = await client.post(
        f"/api/v1/surveys/{survey_id}/close",
        headers=headers,
    )
    assert closed.status_code == 200, closed.text
    assert closed.json()["status"] == "closed"

    blocked = await client.post(
        f"/api/v1/public/surveys/{version_id}/respondents"
    )
    assert blocked.status_code == 400, blocked.text
