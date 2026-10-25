"""Plan → survey → publish → respond → analytics/respondents integrity."""

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
            "organization_name": "Integrity Org",
        },
    )
    assert register.status_code == 201, register.text
    verify = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()


@pytest.mark.asyncio
async def test_plan_to_analytics_integrity(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="integrity@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={"research_goal": "Measure clinic wait times end to end."},
    )
    assert create.status_code == 201, create.text
    plan_id = create.json()["id"]
    assert create.json()["is_locked"] is False

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

    # 1) Plan → one survey; generating questions locks the plan.
    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "Wait Times", "generate": True},
    )
    assert created.status_code == 201, created.text
    survey_id = created.json()["survey"]["id"]

    plan = await client.get(f"/api/v1/plans/{plan_id}", headers=headers)
    assert plan.status_code == 200, plan.text
    assert plan.json()["is_locked"] is True
    assert plan.json()["linked_survey_id"] == survey_id

    # 2) Publish once → stable share path + current_version_id.
    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text
    version_id = pub.json()["version_id"]
    assert pub.json()["collection_path"] == f"/s/{survey_id}"

    # 3) Re-publish blocked — one live instrument.
    again = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert again.status_code == 400, again.text
    assert "already published" in again.json()["detail"].lower()

    # 4) Questions + status unlock + AI regenerate locked while published.
    unlock = await client.patch(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
        json={"status": "draft"},
    )
    assert unlock.status_code == 400, unlock.text
    assert "published" in unlock.json()["detail"].lower() or "status" in unlock.json()[
        "detail"
    ].lower()

    anon = await client.patch(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
        json={"anonymous_collection": True},
    )
    assert anon.status_code == 400, anon.text

    survey = await client.get(f"/api/v1/surveys/{survey_id}", headers=headers)
    content = next(
        s
        for s in survey.json()["sections"]
        if s["title"] != "Respondent details"
    )
    qid = content["questions"][0]["id"]
    locked = await client.patch(
        f"/api/v1/surveys/{survey_id}/questions/{qid}",
        headers=headers,
        json={"prompt_text": "Should not apply"},
    )
    assert locked.status_code == 400, locked.text

    # 5) Public form uses the same version + question ids as the draft snapshot.
    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    assert public.json()["survey_version_id"] == version_id
    identity_qs = {
        q["prompt_text"]: q for q in public.json()["sections"][0]["questions"]
    }
    content_pub = public.json()["sections"][1]
    q_required = content_pub["questions"][0]
    q_optional = content_pub["questions"][1]
    assert q_required["id"] == qid
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
    assert done.json()["survey_version_id"] == version_id

    # 6) Collect / Respondents / Analytics all share current_version_id + count.
    stats = await client.get(
        f"/api/v1/surveys/{survey_id}/collect-stats",
        headers=headers,
    )
    assert stats.status_code == 200, stats.text
    assert stats.json()["current_version_id"] == version_id
    assert stats.json()["response_count"] == 1

    respondents = await client.get(
        f"/api/v1/surveys/{survey_id}/respondents",
        headers=headers,
    )
    assert respondents.status_code == 200, respondents.text
    rbody = respondents.json()
    assert rbody["summary"]["completed"] == 1
    assert len(rbody["respondents"]) == 1
    assert rbody["respondents"][0]["survey_version_id"] == version_id
    assert rbody["respondents"][0]["email"] == "ada@example.com"

    summary = await client.get(
        f"/api/v1/surveys/{survey_id}/analytics/summary",
        headers=headers,
    )
    assert summary.status_code == 200, summary.text
    sbody = summary.json()
    assert sbody["survey_id"] == survey_id
    assert sbody["survey_version_id"] == version_id
    assert sbody["response_count"] == 1

    query = await client.post(
        f"/api/v1/surveys/{survey_id}/analytics/query",
        headers=headers,
        json={"question_ids": [q_required["id"]]},
    )
    assert query.status_code == 200, query.text
    qbody = query.json()
    assert qbody["survey_version_id"] == version_id
    assert len(qbody["distributions"]) == 1
    dist = qbody["distributions"][0]
    assert dist["question_id"] == q_required["id"]
    assert dist["total_responses"] == 1
    assert any(b["value"] == 1 for b in dist["buckets"])

    detail = await client.get(
        f"/api/v1/surveys/{survey_id}/respondents/{rbody['respondents'][0]['id']}",
        headers=headers,
    )
    assert detail.status_code == 200, detail.text
    dbody = detail.json()
    assert dbody["survey_version_id"] == version_id
    answered = {a["question_id"]: a for a in dbody["answers"] if a["answered"]}
    assert answered[q_required["id"]]["value"] is not None
