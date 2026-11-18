"""Org viewer seat cannot mutate surveys, plans, or AI workflows."""

from __future__ import annotations

from urllib.parse import parse_qs, urlparse
from uuid import uuid4

import pytest
from httpx import AsyncClient

from tests.test_dicdo_features import _register_and_verify, _seed_survey


@pytest.mark.asyncio
async def test_viewer_cannot_mutate_surveys_or_plans(
    client: AsyncClient,
    fixed_otp: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    owner = await _register_and_verify(
        client,
        email=f"owner-{uuid4().hex[:8]}@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    owner_headers = {"Authorization": f"Bearer {owner['access_token']}"}

    survey_id = await _seed_survey(client, owner_headers, monkeypatch)

    invite = await client.post(
        "/api/v1/org/invites",
        headers=owner_headers,
        json={"email": f"viewer-{uuid4().hex[:8]}@example.com", "role": "viewer"},
    )
    assert invite.status_code == 201, invite.text
    invite_body = invite.json()
    token = parse_qs(urlparse(invite_body["dev_invite_url"]).query)["token"][0]

    viewer_accept = await client.post(
        "/api/v1/auth/accept-invite",
        json={
            "token": token,
            "full_name": "Read Only",
            "password": "SecurePass1!",
        },
    )
    assert viewer_accept.status_code == 200, viewer_accept.text
    assert viewer_accept.json()["user"]["role"] == "viewer"
    viewer_headers = {
        "Authorization": f"Bearer {viewer_accept.json()['access_token']}"
    }

    read_survey = await client.get(
        f"/api/v1/surveys/{survey_id}",
        headers=viewer_headers,
    )
    assert read_survey.status_code == 200, read_survey.text

    delete_blocked = await client.delete(
        f"/api/v1/surveys/{survey_id}",
        headers=viewer_headers,
    )
    assert delete_blocked.status_code == 403, delete_blocked.text

    plan_blocked = await client.post(
        "/api/v1/plans",
        headers=viewer_headers,
        json={"research_goal": "Viewer should not create plans."},
    )
    assert plan_blocked.status_code == 403, plan_blocked.text

    review_blocked = await client.post(
        f"/api/v1/surveys/{survey_id}/review",
        headers=viewer_headers,
    )
    assert review_blocked.status_code == 403, review_blocked.text