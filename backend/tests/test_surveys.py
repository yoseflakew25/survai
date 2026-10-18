"""Surveys CRUD + builder generate (Gemini mocked)."""

from __future__ import annotations

from uuid import uuid4

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.ai.schemas import DraftQuestion, DraftSection, SectionDraftOutput, SurveyDraftOutput


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": "Survey Org",
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
                {"title": "Health status", "rationale": "Conditions"},
            ],
            "estimated_length_minutes": 20,
        },
    )
    assert patch.status_code == 200, patch.text
    return plan_id


@pytest.mark.asyncio
async def test_survey_from_plan_generate_and_section_regen(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="builder@example.com",
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
                        prompt_text="What is your age group?",
                        type="single_choice",
                        options=["18-24", "25-34", "35+"],
                        is_required=True,
                        help_text="",
                    )
                ],
            ),
            DraftSection(
                title="Health status",
                questions=[
                    DraftQuestion(
                        prompt_text="How would you rate your health?",
                        type="rating_scale",
                        options=[],
                        is_required=True,
                        help_text="1 = Poor, 5 = Excellent",
                    )
                ],
            ),
        ],
        notes="Review wording before publish.",
    )

    async def _fake_draft(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=draft,
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=20,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "Rural Health Survey", "generate": True},
    )
    assert created.status_code == 201, created.text
    body = created.json()
    survey = body["survey"]
    survey_id = survey["id"]
    assert survey["plan_id"] == plan_id
    assert survey["title"] == "Rural Health Survey"
    assert len(survey["sections"]) == 2
    assert survey["sections"][0]["questions"][0]["source"] == "ai_generated"
    assert survey["sections"][0]["questions"][0]["options"][0]["label"] == "18-24"
    assert body["notes"] == "Review wording before publish."

    # Manual question update marks ai_edited
    qid = survey["sections"][0]["questions"][0]["id"]
    updated_q = await client.patch(
        f"/api/v1/surveys/{survey_id}/questions/{qid}",
        headers=headers,
        json={"prompt_text": "What age group are you in?"},
    )
    assert updated_q.status_code == 200, updated_q.text
    assert updated_q.json()["source"] == "ai_edited"
    assert "OLD" not in updated_q.json()["prompt_text"]

    # Section regenerate hard-replaces that section only
    section_id = survey["sections"][1]["id"]
    other_section_id = survey["sections"][0]["id"]
    old_health_prompt = survey["sections"][1]["questions"][0]["prompt_text"]

    section_out = SectionDraftOutput(
        title="Health status (revised)",
        questions=[
            DraftQuestion(
                prompt_text="NEW_HEALTH_QUESTION_ONLY",
                type="long_text",
                options=[],
                is_required=False,
                help_text="",
            )
        ],
        notes="",
    )

    async def _fake_section(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=section_out,
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=10,
        )

    monkeypatch.setattr(
        "app.services.survey.regenerate_section",
        _fake_section,
    )

    regen = await client.post(
        f"/api/v1/surveys/{survey_id}/sections/{section_id}/regenerate",
        headers=headers,
    )
    assert regen.status_code == 200, regen.text
    regen_survey = regen.json()["survey"]
    assert len(regen_survey["sections"]) == 2
    demo = next(s for s in regen_survey["sections"] if s["id"] == other_section_id)
    health = next(s for s in regen_survey["sections"] if s["id"] == section_id)
    assert demo["questions"][0]["prompt_text"] == "What age group are you in?"
    assert health["title"] == "Health status (revised)"
    assert health["questions"][0]["prompt_text"] == "NEW_HEALTH_QUESTION_ONLY"
    assert old_health_prompt not in str(health)

    listed = await client.get("/api/v1/surveys", headers=headers)
    assert listed.status_code == 200
    assert listed.json()["total"] >= 1
    assert all(s["plan_id"] for s in listed.json()["surveys"])


@pytest.mark.asyncio
async def test_from_plan_reuses_same_survey_id(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    """One plan → one survey; from-plan again keeps the same id and hard-replaces."""
    tokens = await _register_and_verify(
        client,
        email="oneplan@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    plan_id = await _seed_plan(client, headers)

    draft_a = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="FIRST_DRAFT_SECTION",
                questions=[
                    DraftQuestion(
                        prompt_text="FIRST_DRAFT_QUESTION",
                        type="short_text",
                        options=[],
                        is_required=True,
                        help_text="",
                    )
                ],
            )
        ],
        notes="",
    )
    draft_b = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="SECOND_DRAFT_SECTION",
                questions=[
                    DraftQuestion(
                        prompt_text="SECOND_DRAFT_QUESTION",
                        type="short_text",
                        options=[],
                        is_required=True,
                        help_text="",
                    )
                ],
            )
        ],
        notes="",
    )
    drafts = iter([draft_a, draft_b])

    async def _fake_draft(**kwargs):  # noqa: ANN003
        return StructuredCallResult(
            value=next(drafts),
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    first = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "One Survey", "generate": True},
    )
    assert first.status_code == 201, first.text
    survey_id = first.json()["survey"]["id"]
    assert first.json()["survey"]["sections"][0]["title"] == "FIRST_DRAFT_SECTION"

    second = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "title": "One Survey", "generate": True},
    )
    assert second.status_code == 200, second.text
    assert second.json()["survey"]["id"] == survey_id
    blob = str(second.json()["survey"])
    assert "FIRST_DRAFT_SECTION" not in blob
    assert "FIRST_DRAFT_QUESTION" not in blob
    assert second.json()["survey"]["sections"][0]["title"] == "SECOND_DRAFT_SECTION"


@pytest.mark.asyncio
async def test_generate_hard_replaces_prior_sections(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    tokens = await _register_and_verify(
        client,
        email="replace@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}
    plan_id = await _seed_plan(client, headers)

    created = await client.post(
        "/api/v1/surveys/from-plan",
        headers=headers,
        json={"plan_id": plan_id, "generate": False},
    )
    assert created.status_code == 201, created.text
    survey_id = created.json()["survey"]["id"]

    # Seed stale section content
    sec = await client.post(
        f"/api/v1/surveys/{survey_id}/sections",
        headers=headers,
        json={"title": "OLD_SECTION_MARKER"},
    )
    assert sec.status_code == 201, sec.text
    section_id = sec.json()["id"]
    q = await client.post(
        f"/api/v1/surveys/{survey_id}/questions",
        headers=headers,
        json={
            "section_id": section_id,
            "type": "short_text",
            "prompt_text": "OLD_QUESTION_MARKER",
            "is_required": True,
        },
    )
    assert q.status_code == 201, q.text

    replacement = SurveyDraftOutput(
        sections=[
            DraftSection(
                title="NEW_SECTION_ONLY",
                questions=[
                    DraftQuestion(
                        prompt_text="NEW_QUESTION_ONLY",
                        type="short_text",
                        options=[],
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
            value=replacement,
            model="gemini-test",
            prompt_version="builder_v1",
            request_id=str(uuid4()),
            latency_ms=5,
        )

    monkeypatch.setattr(
        "app.services.survey.generate_survey_draft",
        _fake_draft,
    )

    gen = await client.post(
        f"/api/v1/surveys/{survey_id}/generate",
        headers=headers,
    )
    assert gen.status_code == 200, gen.text
    survey = gen.json()["survey"]
    blob = str(survey)
    assert "OLD_SECTION_MARKER" not in blob
    assert "OLD_QUESTION_MARKER" not in blob
    assert survey["sections"][0]["title"] == "NEW_SECTION_ONLY"
    assert survey["sections"][0]["questions"][0]["prompt_text"] == "NEW_QUESTION_ONLY"
