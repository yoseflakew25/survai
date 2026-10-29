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
    assert body["collection_path"] == f"/s/{survey_id}"

    stats = await client.get(
        f"/api/v1/surveys/{survey_id}/collect-stats",
        headers=headers,
    )
    assert stats.status_code == 200, stats.text
    assert stats.json()["response_count"] == 0
    assert stats.json()["current_version_id"] == version_id
    assert stats.json()["collection_path"] == f"/s/{survey_id}"

    # Canonical share link is survey id; version id bookmarks also resolve live.
    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    public_body = public.json()
    assert public_body["id"] == survey_id
    assert public_body["survey_version_id"] == version_id
    public_via_version = await client.get(
        f"/api/v1/public/surveys/{version_id}"
    )
    assert public_via_version.status_code == 200, public_via_version.text
    assert public_via_version.json()["survey_version_id"] == version_id
    # Identity section + content section
    assert len(public_body["sections"]) == 2
    assert public_body["sections"][0]["title"] == "Respondent details"
    identity_qs = {
        q["prompt_text"]: q for q in public_body["sections"][0]["questions"]
    }
    assert set(identity_qs) >= {"First Name", "Last Name", "Email"}
    content = public_body["sections"][1]
    q_required = content["questions"][0]
    q_optional = content["questions"][1]
    assert q_required["is_required"] is True

    # Incomplete submit (missing required) → 400 and no respondent row
    incomplete = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                {
                    "question_id": identity_qs["First Name"]["id"],
                    "value": "Ada",
                }
            ]
        },
    )
    assert incomplete.status_code == 400, incomplete.text

    opt_value = q_required["options"][0]["value"]
    done = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                {
                    "question_id": identity_qs["First Name"]["id"],
                    "value": "Ada",
                },
                {
                    "question_id": identity_qs["Last Name"]["id"],
                    "value": "Lovelace",
                },
                {
                    "question_id": identity_qs["Email"]["id"],
                    "value": "ada@example.com",
                },
                {"question_id": q_required["id"], "value": opt_value},
                {"question_id": q_optional["id"], "value": "Went fine"},
            ]
        },
    )
    assert done.status_code == 200, done.text
    assert done.json()["completed_at"] is not None
    assert done.json()["survey_version_id"] == version_id

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
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={"answers": []},
    )
    assert blocked.status_code == 400, blocked.text


@pytest.mark.asyncio
async def test_published_survey_blocks_question_mutations(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="locked-qs@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey_with_questions(client, headers, monkeypatch)

    survey = await client.get(f"/api/v1/surveys/{survey_id}", headers=headers)
    assert survey.status_code == 200, survey.text
    content = next(
        s
        for s in survey.json()["sections"]
        if s["title"] != "Respondent details"
    )
    qid = content["questions"][0]["id"]
    section_id = content["id"]

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text

    patch_q = await client.patch(
        f"/api/v1/surveys/{survey_id}/questions/{qid}",
        headers=headers,
        json={"prompt_text": "Should not apply"},
    )
    assert patch_q.status_code == 400, patch_q.text
    assert "published" in patch_q.json()["detail"].lower()

    add_q = await client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        headers=headers,
        json={
            "section_id": section_id,
            "type": "short_text",
            "prompt_text": "New locked question",
            "is_required": False,
        },
    )
    assert add_q.status_code == 400, add_q.text

    regen = await client.post(
        f"/api/v1/surveys/{survey_id}/generate",
        headers=headers,
    )
    assert regen.status_code == 400, regen.text
    assert "published" in regen.json()["detail"].lower()

    delete_live = await client.delete(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
    )
    assert delete_live.status_code == 400, delete_live.text
    assert "cannot be deleted" in delete_live.json()["detail"].lower()

    still_there = await client.get(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
    )
    assert still_there.status_code == 200
