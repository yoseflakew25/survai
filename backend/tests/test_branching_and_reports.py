"""Skip-logic on submit, saved-analysis report filters, GET /reports/{id}."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.ai.schemas import (
    DraftQuestion,
    DraftSection,
    GroundedStatement,
    ReportGenerationOutput,
    ReportSectionAI,
    SurveyDraftOutput,
)


async def _register_and_verify(
    client: AsyncClient,
    *,
    email: str,
    password: str,
    code: str,
    org: str = "Branch Org",
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": org,
        },
    )
    assert register.status_code == 201, register.text
    verify = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": code},
    )
    assert verify.status_code == 200, verify.text
    return verify.json()


async def _seed_survey(
    client: AsyncClient,
    headers: dict,
    monkeypatch: pytest.MonkeyPatch,
    *,
    title: str = "Wait Times",
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
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": title, "generate": True},
    )
    assert created.status_code == 201, created.text
    return created.json()["survey"]["id"]


def _fake_report_output() -> ReportGenerationOutput:
    empty = ReportSectionAI(heading="Section", statements=[])
    fields = {name: empty for name in ReportGenerationOutput.model_fields}
    fields["executive_summary"] = ReportSectionAI(
        heading="Summary",
        statements=[
            GroundedStatement(text="We collected responses.", metric_ref="")
        ],
    )
    return ReportGenerationOutput(**fields)


def _identity_answers(identity: dict) -> list[dict]:
    return [
        {"question_id": identity["First Name"]["id"], "value": "Ada"},
        {"question_id": identity["Last Name"]["id"], "value": "Lovelace"},
        {
            "question_id": identity["Email"]["id"],
            "value": f"ada-{uuid4().hex[:8]}@example.com",
        },
    ]


@pytest.mark.asyncio
async def test_submit_skips_inactive_required_branch(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="skip-submit@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey(client, headers, monkeypatch)

    survey = await client.get(f"/api/v1/surveys/{survey_id}", headers=headers)
    assert survey.status_code == 200, survey.text
    content = next(
        s
        for s in survey.json()["sections"]
        if s["title"] != "Respondent details"
    )
    gate = content["questions"][0]
    over_opt = next(
        o for o in gate["options"] if "over_30" in o["value"] or "Over 30" in o["label"]
    )
    under_opt = next(
        o
        for o in gate["options"]
        if "under_15" in o["value"] or "Under 15" in o["label"]
    )

    follow = await client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        headers=headers,
        json={
            "section_id": content["id"],
            "type": "long_text",
            "prompt_text": "Why was the wait so long?",
            "is_required": True,
            "conditional_logic": {
                "operator": "AND",
                "rules": [
                    {
                        "question_id": gate["id"],
                        "op": "eq",
                        "value": over_opt["value"],
                    }
                ],
            },
        },
    )
    assert follow.status_code == 201, follow.text
    follow_id = follow.json()["id"]

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text

    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    identity = {
        q["prompt_text"]: q for q in public.json()["sections"][0]["questions"]
    }

    # Gate inactive → required follow-up may be omitted
    skipped = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                *_identity_answers(identity),
                {"question_id": gate["id"], "value": under_opt["value"]},
            ]
        },
    )
    assert skipped.status_code == 200, skipped.text
    assert skipped.json()["completed_at"] is not None

    # Gate active → missing follow-up rejected
    missing = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                *_identity_answers(identity),
                {"question_id": gate["id"], "value": over_opt["value"]},
            ]
        },
    )
    assert missing.status_code == 400, missing.text
    assert "missing required" in missing.json()["detail"].lower()

    # Gate active + follow-up answered → ok
    done = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                *_identity_answers(identity),
                {"question_id": gate["id"], "value": over_opt["value"]},
                {"question_id": follow_id, "value": "Staffing shortage"},
            ]
        },
    )
    assert done.status_code == 200, done.text


@pytest.mark.asyncio
async def test_saved_analysis_filters_report_and_get_by_id(
    client: AsyncClient,
    session,
    fixed_otp: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tokens = await _register_and_verify(
        client,
        email="saved-view@example.com",
        password="SecurePass1!",
        code=fixed_otp,
        org="Saved View Org",
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey(
        client, headers, monkeypatch, title="Saved View Survey"
    )

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text

    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    identity = {
        q["prompt_text"]: q for q in public.json()["sections"][0]["questions"]
    }
    content_q = public.json()["sections"][1]["questions"][0]
    opt_a = content_q["options"][0]["value"]
    opt_b = content_q["options"][1]["value"]

    for value in (opt_a, opt_b):
        submitted = await client.post(
            f"/api/v1/public/surveys/{survey_id}/submit",
            json={
                "answers": [
                    *_identity_answers(identity),
                    {"question_id": content_q["id"], "value": value},
                ]
            },
        )
        assert submitted.status_code == 200, submitted.text

    saved = await client.post(
        f"/api/v1/surveys/{survey_id}/saved-analyses",
        headers=headers,
        json={
            "name": "Only first option",
            "filters": [
                {
                    "question_id": content_q["id"],
                    "op": "eq",
                    "value": opt_a,
                }
            ],
        },
    )
    assert saved.status_code == 201, saved.text
    saved_id = saved.json()["id"]
    assert saved.json()["filters"][0]["op"] == "eq"

    listed = await client.get(
        f"/api/v1/surveys/{survey_id}/saved-analyses",
        headers=headers,
    )
    assert listed.status_code == 200, listed.text
    assert any(row["id"] == saved_id for row in listed.json())

    async def _fake_generate_report(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=_fake_report_output(),
            model="gemini-test",
            prompt_version="report_v1",
            request_id=str(uuid4()),
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.report.generate_report",
        _fake_generate_report,
    )

    created = await client.post(
        f"/api/v1/surveys/{survey_id}/reports",
        headers=headers,
        json={
            "audience": "internal",
            "title": "Filtered brief",
            "saved_analysis_id": saved_id,
        },
    )
    assert created.status_code == 201, created.text
    report = created.json()
    report_id = report["id"]
    assert report["title"] == "Filtered brief"
    assert report["stats"]["response_count"] == 2

    from uuid import UUID

    from app.models.report import Report

    row = await session.get(Report, UUID(report_id))
    assert row is not None
    snap = row.metrics_snapshot or {}
    assert snap.get("saved_analysis_id") == saved_id
    assert snap.get("filter_count") == 1
    # Filtered frame should only count the matching option in distributions.
    dists = snap.get("distributions") or []
    assert dists
    matched = next(
        (d for d in dists if d.get("question_id") == content_q["id"]),
        dists[0],
    )
    assert matched["total_responses"] == 1

    # Re-fetch by id for deep-link support.
    by_id = await client.get(
        f"/api/v1/reports/{report_id}",
        headers=headers,
    )
    assert by_id.status_code == 200, by_id.text
    assert by_id.json()["id"] == report_id
    assert by_id.json()["survey_id"] == survey_id

    deleted = await client.delete(
        f"/api/v1/surveys/{survey_id}/saved-analyses/{saved_id}",
        headers=headers,
    )
    assert deleted.status_code == 204, deleted.text
    listed_after = await client.get(
        f"/api/v1/surveys/{survey_id}/saved-analyses",
        headers=headers,
    )
    assert listed_after.status_code == 200, listed_after.text
    assert all(row["id"] != saved_id for row in listed_after.json())
    missing = await client.delete(
        f"/api/v1/surveys/{survey_id}/saved-analyses/{saved_id}",
        headers=headers,
    )
    assert missing.status_code == 404, missing.text

    # Cross-org isolation
    other = await _register_and_verify(
        client,
        email="other-org@example.com",
        password="SecurePass1!",
        code=fixed_otp,
        org="Other Org",
    )
    foreign = await client.get(
        f"/api/v1/reports/{report_id}",
        headers={"Authorization": f"Bearer {other['access_token']}"},
    )
    assert foreign.status_code == 404, foreign.text


@pytest.mark.asyncio
async def test_owner_researcher_dogfood_path(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Owner invites Researcher → Researcher publishes, collects, reports."""
    owner = await _register_and_verify(
        client,
        email="dogfood-owner@example.com",
        password="SecurePass1!",
        code=fixed_otp,
        org="Dogfood Org",
    )
    owner_headers = {"Authorization": f"Bearer {owner['access_token']}"}

    invite = await client.post(
        "/api/v1/org/invites",
        headers=owner_headers,
        json={"email": "dogfood-researcher@example.com", "role": "researcher"},
    )
    assert invite.status_code == 201, invite.text
    token = parse_qs(urlparse(invite.json()["dev_invite_url"]).query)["token"][0]

    accepted = await client.post(
        "/api/v1/auth/accept-invite",
        json={
            "token": token,
            "full_name": "Dogfood Researcher",
            "password": "SecurePass1!",
        },
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["user"]["role"] == "researcher"
    researcher_headers = {
        "Authorization": f"Bearer {accepted.json()['access_token']}"
    }

    survey_id = await _seed_survey(
        client, researcher_headers, monkeypatch, title="Dogfood Survey"
    )

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=researcher_headers,
    )
    assert pub.status_code == 200, pub.text

    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    identity = {
        q["prompt_text"]: q for q in public.json()["sections"][0]["questions"]
    }
    content_q = public.json()["sections"][1]["questions"][0]
    submit = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                *_identity_answers(identity),
                {
                    "question_id": content_q["id"],
                    "value": content_q["options"][0]["value"],
                },
            ]
        },
    )
    assert submit.status_code == 200, submit.text

    analytics = await client.get(
        f"/api/v1/surveys/{survey_id}/analytics/summary",
        headers=researcher_headers,
    )
    assert analytics.status_code == 200, analytics.text
    assert analytics.json()["response_count"] == 1

    async def _fake_generate_report(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=_fake_report_output(),
            model="gemini-test",
            prompt_version="report_v1",
            request_id=str(uuid4()),
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.report.generate_report",
        _fake_generate_report,
    )

    report = await client.post(
        f"/api/v1/surveys/{survey_id}/reports",
        headers=researcher_headers,
        json={"audience": "donor", "title": "Dogfood donor brief"},
    )
    assert report.status_code == 201, report.text
    report_id = report.json()["id"]

    # Owner can open the same report (notification deep-link target)
    owner_view = await client.get(
        f"/api/v1/reports/{report_id}",
        headers=owner_headers,
    )
    assert owner_view.status_code == 200, owner_view.text
    assert owner_view.json()["id"] == report_id

    # Researcher still cannot manage seats
    blocked = await client.post(
        "/api/v1/org/invites",
        headers=researcher_headers,
        json={"email": "viewer@example.com", "role": "viewer"},
    )
    assert blocked.status_code == 403, blocked.text

    # Report-ready notification includes ?reportId= deep-link
    notifs = await client.get("/api/v1/notifications", headers=owner_headers)
    assert notifs.status_code == 200, notifs.text
    ready = [
        n
        for n in notifs.json()["notifications"]
        if n.get("type") == "report_ready"
    ]
    assert ready, notifs.json()
    assert f"reportId={report_id}" in (ready[0].get("href") or "")
