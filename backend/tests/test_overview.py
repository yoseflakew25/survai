"""Org overview KPIs + activity series."""

import pytest
from httpx import AsyncClient

from tests.test_auth import _register_and_verify


@pytest.mark.asyncio
async def test_overview_empty_workspace(client: AsyncClient, fixed_otp: str) -> None:
    tokens = await _register_and_verify(
        client,
        email="overview@example.com",
        password="SecurePass1!",
        organization_name="Overview Org",
        code=fixed_otp,
    )
    headers = {"Authorization": f"Bearer {tokens['access_token']}"}

    res = await client.get("/api/v1/overview", headers=headers)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["surveys_total"] == 0
    assert body["responses_total"] == 0
    assert body["reports_total"] == 0
    assert body["completion_rate"] == 0.0
    assert len(body["kpis"]) == 4
    assert len(body["activity"]) == 12
    assert all(p["started"] == 0 and p["completed"] == 0 for p in body["activity"])
    assert body["kpis"][0]["label"] == "Total Surveys"
    assert body["kpis"][0]["value"] == "0"


@pytest.mark.asyncio
async def test_overview_requires_auth(client: AsyncClient) -> None:
    res = await client.get("/api/v1/overview")
    assert res.status_code == 401
