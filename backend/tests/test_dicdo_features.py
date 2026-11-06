"""DICDO high-value features: seats, quota, export pack, compare."""

from __future__ import annotations

import base64
import zipfile
from io import BytesIO
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.client import StructuredCallResult
from app.ai.schemas import DraftQuestion, DraftSection, SurveyDraftOutput
from app.models.collection import SurveyVersion
from app.models.report import Report, ReportAudience, ReportStatus
from app.models.survey import Survey
from app.models.user import User
from app.services.compare import _norm_prompt
from app.services.report import ReportService


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str, org: str = "Dicdo Org"
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
    title: str = "Baseline Wave",
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


def test_compare_prompt_normalization() -> None:
    assert _norm_prompt("  How  Long DID you wait? ") == "how long did you wait?"


@pytest.mark.asyncio
async def test_org_invite_accept_and_cross_org_isolation(
    client: AsyncClient, fixed_otp: str
) -> None:
    owner_a = await _register_and_verify(
        client,
        email="owner-a@example.com",
        password="SecurePass1!",
        code=fixed_otp,
        org="Org A",
    )
    headers_a = {"Authorization": f"Bearer {owner_a['access_token']}"}

    owner_b = await _register_and_verify(
        client,
        email="owner-b@example.com",
        password="SecurePass1!",
        code=fixed_otp,
        org="Org B",
    )
    headers_b = {"Authorization": f"Bearer {owner_b['access_token']}"}

    invite = await client.post(
        "/api/v1/org/invites",
        headers=headers_a,
        json={"email": "researcher@example.com", "role": "researcher"},
    )
    assert invite.status_code == 201, invite.text
    body = invite.json()
    assert body["invite"]["role"] == "researcher"
    assert body["dev_invite_url"]
    token = parse_qs(urlparse(body["dev_invite_url"]).query)["token"][0]

    # Owner B cannot see Org A team
    foreign = await client.get("/api/v1/org/team", headers=headers_b)
    assert foreign.status_code == 200, foreign.text
    assert all(m["email"] != "researcher@example.com" for m in foreign.json()["members"])
    assert foreign.json()["invites"] == []

    accepted = await client.post(
        "/api/v1/auth/accept-invite",
        json={
            "token": token,
            "full_name": "Researcher One",
            "password": "SecurePass1!",
        },
    )
    assert accepted.status_code == 200, accepted.text
    assert accepted.json()["user"]["role"] == "researcher"

    team = await client.get("/api/v1/org/team", headers=headers_a)
    assert team.status_code == 200, team.text
    emails = {m["email"] for m in team.json()["members"]}
    assert "researcher@example.com" in emails

    # Researcher cannot invite
    researcher_headers = {
        "Authorization": f"Bearer {accepted.json()['access_token']}"
    }
    blocked = await client.post(
        "/api/v1/org/invites",
        headers=researcher_headers,
        json={"email": "viewer@example.com", "role": "viewer"},
    )
    assert blocked.status_code == 403, blocked.text


@pytest.mark.asyncio
async def test_response_quota_rejects_submit(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="quota@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey(client, headers, monkeypatch)

    settings = await client.patch(
        f"/api/v1/surveys/{survey_id}",
        headers=headers,
        json={"response_quota": 1},
    )
    assert settings.status_code == 200, settings.text
    assert settings.json()["response_quota"] == 1

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text

    public = await client.get(f"/api/v1/public/surveys/{survey_id}")
    assert public.status_code == 200, public.text
    sections = public.json()["sections"]
    identity = {q["prompt_text"]: q for q in sections[0]["questions"]}
    content_q = sections[1]["questions"][0]
    opt = content_q["options"][0]["value"]

    answers = [
        {"question_id": identity["First Name"]["id"], "value": "Ada"},
        {"question_id": identity["Last Name"]["id"], "value": "Lovelace"},
        {"question_id": identity["Email"]["id"], "value": "ada@example.com"},
        {"question_id": content_q["id"], "value": opt},
    ]
    first = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={"answers": answers},
    )
    assert first.status_code == 200, first.text

    second = await client.post(
        f"/api/v1/public/surveys/{survey_id}/submit",
        json={
            "answers": [
                {"question_id": identity["First Name"]["id"], "value": "Grace"},
                {"question_id": identity["Last Name"]["id"], "value": "Hopper"},
                {
                    "question_id": identity["Email"]["id"],
                    "value": "grace@example.com",
                },
                {"question_id": content_q["id"], "value": opt},
            ]
        },
    )
    assert second.status_code == 400, second.text
    assert "quota" in second.json()["detail"].lower()


@pytest.mark.asyncio
async def test_duplicate_as_endline_and_compare(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="compare@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey(client, headers, monkeypatch, title="Wave A")

    endline = await client.post(
        f"/api/v1/surveys/{survey_id}/duplicate-as-endline",
        headers=headers,
    )
    assert endline.status_code == 201, endline.text
    end_body = endline.json()
    assert end_body["wave_label"] == "endline"
    assert end_body["instrument_family_id"] is not None

    baseline = await client.get(f"/api/v1/surveys/{survey_id}", headers=headers)
    assert baseline.status_code == 200, baseline.text
    assert baseline.json()["wave_label"] == "baseline"
    assert (
        baseline.json()["instrument_family_id"] == end_body["instrument_family_id"]
    )

    cmp = await client.get(
        f"/api/v1/surveys/{survey_id}/compare",
        headers=headers,
        params={"other_id": end_body["id"]},
    )
    assert cmp.status_code == 200, cmp.text
    data = cmp.json()
    assert data["family_id"] == end_body["instrument_family_id"]
    assert data["baseline"]["id"] == survey_id
    assert data["endline"]["id"] == end_body["id"]
    prompts = {p["prompt_text"] for p in data["pairs"]}
    assert "How long did you wait?" in prompts


@pytest.mark.asyncio
async def test_export_pack_zip_contents(
    client: AsyncClient,
    session: AsyncSession,
    fixed_otp: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    tokens = await _register_and_verify(
        client,
        email="pack@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    survey_id = await _seed_survey(client, headers, monkeypatch, title="Pack Survey")

    pub = await client.post(
        f"/api/v1/surveys/{survey_id}/publish",
        headers=headers,
    )
    assert pub.status_code == 200, pub.text
    version_id = pub.json()["version_id"]

    survey = await session.get(Survey, UUID(survey_id))
    assert survey is not None
    report = Report(
        survey_id=survey.id,
        survey_version_id=UUID(version_id),
        created_by=UUID(tokens["user"]["id"]),
        title="Donor Brief",
        audience=ReportAudience.donor.value,
        status=ReportStatus.draft.value,
        sections=[
            {
                "id": "executive_summary",
                "title": "Executive Summary",
                "content": "We collected responses.",
            }
        ],
        metrics_snapshot={"response_count": 0},
    )
    session.add(report)
    await session.commit()
    await session.refresh(report)

    ver = await session.get(SurveyVersion, report.survey_version_id)
    assert ver is not None

    svc = ReportService(session)
    user = await session.get(User, report.created_by)
    assert user is not None
    exported = await svc.export_pack(user=user, report_id=report.id)
    assert exported.type == "zip"
    assert exported.content_base64
    raw = base64.b64decode(exported.content_base64)
    assert raw[:2] == b"PK"
    with zipfile.ZipFile(BytesIO(raw)) as zf:
        names = set(zf.namelist())
    assert any(n.endswith("-report.pdf") for n in names)
    assert any(n.endswith("-report.docx") for n in names)
    assert any(n.endswith("-analytics.csv") for n in names)
