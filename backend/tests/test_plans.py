"""Plans CRUD + generate (Gemini mocked)."""

from __future__ import annotations

import json
from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.ai.schemas import (
    PlanInterviewBrief,
    PlanInterviewTurnOutput,
    ProposedSection,
    SurveyPlanOutput,
)


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": "Plan Org",
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
async def test_plan_crud_and_mocked_generate(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="planner@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={
            "research_goal": "Understand community health needs in rural districts."
        },
    )
    assert create.status_code == 201, create.text
    plan = create.json()
    assert plan["status"] == "draft"
    assert plan["objectives"] == []
    plan_id = plan["id"]

    fake = SurveyPlanOutput(
        objectives=["Map primary health concerns"],
        research_questions=["What conditions are most common?"],
        target_respondents=["Household heads aged 18-65"],
        proposed_sections=[
            ProposedSection(title="Demographics", rationale="Baseline profile"),
            ProposedSection(title="Health status", rationale="Self-reported conditions"),
        ],
        estimated_length_minutes=20,
        notes="Review before builder.",
    )

    async def _fake_generate(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=fake,
            model="gemini-test",
            prompt_version="planner_v1",
            request_id=str(uuid4()),
            latency_ms=12,
        )

    monkeypatch.setattr(
        "app.services.plan.generate_survey_plan",
        _fake_generate,
    )

    gen = await client.post(f"/api/v1/plans/{plan_id}/generate", headers=headers)
    assert gen.status_code == 200, gen.text
    body = gen.json()
    assert body["objectives"] == fake.objectives
    assert body["plan"]["estimated_length_minutes"] == 20
    assert body["plan"]["ai_generation_meta"]["model"] == "gemini-test"
    assert body["notes"] == "Review before builder."

    got = await client.get(f"/api/v1/plans/{plan_id}", headers=headers)
    assert got.status_code == 200
    assert got.json()["proposed_sections"][0]["title"] == "Demographics"

    approve = await client.post(f"/api/v1/plans/{plan_id}/approve", headers=headers)
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"

    listed = await client.get("/api/v1/plans", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1


@pytest.mark.asyncio
async def test_regenerate_hard_replaces_prior_content(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="regen@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={"research_goal": "Old goal about farm productivity in highlands."},
    )
    assert create.status_code == 201, create.text
    plan_id = create.json()["id"]

    # Seed prior AI-like content that must disappear after regenerate.
    patch = await client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=headers,
        json={
            "objectives": ["OLD_OBJECTIVE_MARKER"],
            "research_questions": ["OLD_QUESTION_MARKER"],
            "target_respondents": ["OLD_RESPONDENT_MARKER"],
            "proposed_sections": [
                {"title": "OLD_SECTION_MARKER", "rationale": "stale"}
            ],
            "estimated_length_minutes": 99,
        },
    )
    assert patch.status_code == 200, patch.text

    replacement = SurveyPlanOutput(
        objectives=["NEW_OBJECTIVE_ONLY"],
        research_questions=["NEW_QUESTION_ONLY"],
        target_respondents=["NEW_RESPONDENT_ONLY"],
        proposed_sections=[
            ProposedSection(title="NEW_SECTION_ONLY", rationale="fresh")
        ],
        estimated_length_minutes=15,
        notes=None,
    )

    async def _fake_generate(**kwargs):  # noqa: ANN003
        assert "urban water" in kwargs["research_goal"].lower()
        return StructuredCallResult(
            value=replacement,
            model="gemini-test",
            prompt_version="planner_v1",
            request_id=str(uuid4()),
            latency_ms=8,
        )

    monkeypatch.setattr(
        "app.services.plan.generate_survey_plan",
        _fake_generate,
    )

    gen = await client.post(
        f"/api/v1/plans/{plan_id}/generate",
        headers=headers,
        json={
            "research_goal": "Understand urban water access for low-income households."
        },
    )
    assert gen.status_code == 200, gen.text
    body = gen.json()["plan"]

    assert body["research_goal"].startswith("Understand urban water")
    assert body["objectives"] == ["NEW_OBJECTIVE_ONLY"]
    assert body["research_questions"] == ["NEW_QUESTION_ONLY"]
    assert body["target_respondents"] == ["NEW_RESPONDENT_ONLY"]
    assert body["proposed_sections"] == [
        {"title": "NEW_SECTION_ONLY", "rationale": "fresh"}
    ]
    assert body["estimated_length_minutes"] == 15

    blob = str(body)
    assert "OLD_OBJECTIVE_MARKER" not in blob
    assert "OLD_QUESTION_MARKER" not in blob
    assert "OLD_RESPONDENT_MARKER" not in blob
    assert "OLD_SECTION_MARKER" not in blob
    assert "farm productivity" not in blob.lower()


@pytest.mark.asyncio
async def test_plan_locks_after_survey_questions_generated(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.ai.schemas import DraftQuestion, DraftSection, SurveyDraftOutput

    tokens = await _register_and_verify(
        client,
        email="locked-plan@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    create = await client.post(
        "/api/v1/plans",
        headers=headers,
        json={"research_goal": "Understand urban transport habits for commuters."},
    )
    assert create.status_code == 201, create.text
    plan_id = create.json()["id"]
    assert create.json()["is_locked"] is False

    patch = await client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=headers,
        json={
            "objectives": ["Map commute modes"],
            "research_questions": ["How do people travel to work?"],
            "target_respondents": ["Adults who commute 3+ days/week"],
            "proposed_sections": [
                {"title": "Travel", "rationale": "Modes and duration"}
            ],
        },
    )
    assert patch.status_code == 200, patch.text

    draft = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="Travel",
                questions=[
                    DraftQuestion(
                        prompt_text="How do you usually commute?",
                        type="single_choice",
                        options=["Bus", "Train", "Car"],
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
        json={"plan_id": plan_id, "title": "Commute Survey", "generate": True},
    )
    assert created.status_code == 201, created.text
    survey_id = created.json()["survey"]["id"]

    got = await client.get(f"/api/v1/plans/{plan_id}", headers=headers)
    assert got.status_code == 200, got.text
    body = got.json()
    assert body["is_locked"] is True
    assert body["linked_survey_id"] == survey_id

    blocked_patch = await client.patch(
        f"/api/v1/plans/{plan_id}",
        headers=headers,
        json={"objectives": ["Should not apply"]},
    )
    assert blocked_patch.status_code == 400, blocked_patch.text
    assert "locked" in blocked_patch.json()["detail"].lower()

    blocked_gen = await client.post(
        f"/api/v1/plans/{plan_id}/generate",
        headers=headers,
        json={"research_goal": "Understand urban transport habits for commuters."},
    )
    assert blocked_gen.status_code == 400, blocked_gen.text
    assert "locked" in blocked_gen.json()["detail"].lower()


@pytest.mark.asyncio
async def test_plan_interview_stream_mocked(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="interview@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    fake = PlanInterviewTurnOutput(
        assistant_reply="Who should take this survey?",
        ready_to_generate=False,
        research_goal_draft="Assess healthcare access in rural clinics.",
        brief=PlanInterviewBrief(
            title_hint="Clinic access",
            audiences=["Patients"],
            decisions=["Program design"],
            constraints=[],
            summary="Exploring healthcare access for patients.",
        ),
    )

    async def _fake_interview(**kwargs):  # noqa: ANN003
        yield ("delta", "Who should take this survey?")
        yield (
            "result",
            StructuredCallResult(
                value=fake,
                model="gemini-test",
                prompt_version="planner_interview_v1",
                request_id=str(uuid4()),
                latency_ms=8,
            ),
        )

    monkeypatch.setattr(
        "app.services.plan.iter_interview_plan_turn",
        _fake_interview,
    )

    res = await client.post(
        "/api/v1/plans/interview/turn/stream",
        headers=headers,
        json={
            "messages": [],
            "content": "I want to understand healthcare access in rural clinics.",
        },
    )
    assert res.status_code == 200, res.text
    assert "text/event-stream" in res.headers.get("content-type", "")
    text = res.text
    assert "event: status" in text
    assert "event: delta" in text
    assert "event: done" in text
    assert "Who should take this survey?" in text
    assert "Clinic access" in text


@pytest.mark.asyncio
async def test_plan_interview_ready_to_generate(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="interview-ready@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    fake = PlanInterviewTurnOutput(
        assistant_reply="Great — we have enough to draft the plan.",
        ready_to_generate=True,
        research_goal_draft=(
            "Assess healthcare access barriers among adult patients in "
            "rural DICDO clinics to inform outreach program design."
        ),
        brief=PlanInterviewBrief(
            title_hint="Healthcare access",
            audiences=["Adult patients"],
            decisions=["Outreach design"],
            constraints=["Rural clinics"],
            summary="Ready to generate a healthcare access plan.",
        ),
    )

    async def _fake_interview(**kwargs):  # noqa: ANN003
        yield ("delta", fake.assistant_reply)
        yield (
            "result",
            StructuredCallResult(
                value=fake,
                model="gemini-test",
                prompt_version="planner_interview_v1",
                request_id=str(uuid4()),
                latency_ms=8,
            ),
        )

    monkeypatch.setattr(
        "app.services.plan.iter_interview_plan_turn",
        _fake_interview,
    )

    res = await client.post(
        "/api/v1/plans/interview/turn/stream",
        headers=headers,
        json={
            "messages": [
                {
                    "role": "user",
                    "content": "Healthcare access in rural clinics for adults.",
                },
                {
                    "role": "assistant",
                    "content": "What decisions should the survey inform?",
                },
            ],
            "content": "Outreach program design for DICDO clinics.",
        },
    )
    assert res.status_code == 200, res.text
    # Parse final done event
    blocks = [b for b in res.text.split("\n\n") if b.strip()]
    done = next(b for b in blocks if b.startswith("event: done"))
    data_line = next(line for line in done.split("\n") if line.startswith("data:"))
    payload = json.loads(data_line[5:].strip())
    assert payload["ready_to_generate"] is True
    assert len(payload["research_goal_draft"]) >= 10
    assert payload["brief"]["title_hint"] == "Healthcare access"
