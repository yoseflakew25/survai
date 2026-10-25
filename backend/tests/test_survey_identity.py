"""Required First Name / Last Name / Email on every survey."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.exceptions import BadRequestError
from app.models.survey import Question
from app.services.survey_identity import (
    IDENTITY_KEYS,
    assert_can_delete_question,
)


def test_assert_cannot_delete_identity_question() -> None:
    q = Question(
        type="short_text",
        prompt_text="First Name",
        is_required=True,
        order_index=0,
        source="manual",
        validation_rules={"survai_key": "first_name"},
    )
    with pytest.raises(BadRequestError):
        assert_can_delete_question(q)


async def _register_and_verify(
    client: AsyncClient, *, email: str, password: str, code: str
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": "Identity Org",
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
async def test_create_survey_seeds_identity_fields(
    client: AsyncClient, fixed_otp: str
) -> None:
    tokens = await _register_and_verify(
        client,
        email="identity-survey@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    res = await client.post(
        "/api/v1/surveys",
        headers=headers,
        json={"title": "Identity check survey", "anonymous_collection": True},
    )
    assert res.status_code == 201, res.text
    survey = res.json()
    prompts = [
        q["prompt_text"]
        for s in survey["sections"]
        for q in s["questions"]
    ]
    assert "First Name" in prompts
    assert "Last Name" in prompts
    assert "Email" in prompts
    assert survey["sections"][0]["title"] == "Respondent details"
    for s in survey["sections"]:
        for q in s["questions"]:
            if q["prompt_text"] in {"First Name", "Last Name", "Email"}:
                assert q["is_required"] is True
                assert q["validation_rules"]["survai_key"] in IDENTITY_KEYS

    first = next(
        q
        for s in survey["sections"]
        for q in s["questions"]
        if q["prompt_text"] == "First Name"
    )
    deleted = await client.delete(
        f"/api/v1/surveys/{survey['id']}/questions/{first['id']}",
        headers=headers,
    )
    assert deleted.status_code == 400, deleted.text
