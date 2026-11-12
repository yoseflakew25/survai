"""System admin console API — authz, suspend, flags, audit, impersonation."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.security import hash_password
from app.models.organization import Organization
from app.models.user import User, UserRole


async def _login(client: AsyncClient, email: str, password: str) -> None:
    res = await client.post(
        "/api/v1/auth/login", json={"email": email, "password": password}
    )
    assert res.status_code == 200, res.text


@pytest.mark.asyncio
async def test_admin_overview_forbidden_for_org_owner(
    client: AsyncClient, fixed_otp: str
) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "owner-admin@example.com",
            "password": "OwnerPass1",
            "organization_name": "Owner Org",
            "full_name": "Owner",
        },
    )
    await client.post(
        "/api/v1/auth/verify-email",
        json={"email": "owner-admin@example.com", "code": fixed_otp},
    )
    res = await client.get("/api/v1/admin/overview")
    assert res.status_code == 403


@pytest.mark.asyncio
async def test_admin_flow_suspend_flags_impersonate_audit(
    client: AsyncClient, session, fixed_otp: str
) -> None:
    # Seed platform admin directly (bootstrap path is env-coupled).
    admin_org = Organization(name="SurvAI Ops")
    session.add(admin_org)
    await session.flush()
    admin = User(
        email="platform-admin@example.com",
        full_name="Platform Admin",
        hashed_password=hash_password("AdminPass12"),
        role=UserRole.system_admin,
        is_superuser=True,
        is_active=True,
        email_verified=True,
        organization_id=admin_org.id,
    )
    session.add(admin)

    target_org = Organization(name="Target Org")
    session.add(target_org)
    await session.flush()
    owner = User(
        email="target-owner@example.com",
        full_name="Target Owner",
        hashed_password=hash_password("OwnerPass12"),
        role=UserRole.organization,
        is_superuser=False,
        is_active=True,
        email_verified=True,
        organization_id=target_org.id,
    )
    session.add(owner)
    await session.commit()

    await _login(client, "platform-admin@example.com", "AdminPass12")

    overview = await client.get("/api/v1/admin/overview")
    assert overview.status_code == 200, overview.text
    body = overview.json()
    assert body["orgs_total"] >= 2
    assert body["users_total"] >= 2
    assert "generated_at" in body
    assert len(body["kpis"]) >= 5
    assert len(body["series_30d"]) == 30
    assert isinstance(body["alerts"], list)
    assert isinstance(body["survey_status"], list)
    assert isinstance(body["user_roles"], list)
    assert body["health"] is not None
    assert "status" in body["health"]
    assert "geo_presence" in body
    assert "countries" in body["geo_presence"]
    assert "users_located" in body["geo_presence"]
    assert "users_unknown" in body["geo_presence"]

    orgs = await client.get("/api/v1/admin/orgs")
    assert orgs.status_code == 200
    assert orgs.json()["total"] >= 2

    flags = await client.patch(
        f"/api/v1/admin/orgs/{target_org.id}/feature-flags",
        json={"flags": {"ai_planner": False, "publish_survey": False}},
    )
    assert flags.status_code == 200, flags.text
    assert flags.json()["flags"]["ai_planner"] is False
    assert flags.json()["flags"]["publish_survey"] is False
    assert flags.json()["flags"]["ai_builder"] is True

    inspect = await client.get(f"/api/v1/admin/orgs/{target_org.id}/inspect")
    assert inspect.status_code == 200
    assert inspect.json()["organization"]["name"] == "Target Org"
    assert len(inspect.json()["members"]) == 1

    imp = await client.post(f"/api/v1/admin/orgs/{target_org.id}/impersonate")
    assert imp.status_code == 200, imp.text
    assert imp.json()["user"]["email"] == "target-owner@example.com"
    assert imp.json()["impersonator_id"] == str(admin.id)

    me = await client.get("/api/v1/auth/me")
    assert me.status_code == 200
    assert me.json()["impersonation"] is True
    assert me.json()["impersonator_id"] == str(admin.id)

    stop = await client.post("/api/v1/admin/impersonate/stop")
    assert stop.status_code == 200, stop.text
    assert stop.json()["user"]["email"] == "platform-admin@example.com"

    suspend = await client.patch(
        f"/api/v1/admin/orgs/{target_org.id}",
        json={"is_active": False, "suspended_reason": "Abuse"},
    )
    assert suspend.status_code == 200
    assert suspend.json()["is_active"] is False

    # Suspended org owner cannot log in.
    await client.post("/api/v1/auth/logout", json={})
    blocked = await client.post(
        "/api/v1/auth/login",
        json={"email": "target-owner@example.com", "password": "OwnerPass12"},
    )
    assert blocked.status_code == 401

    await _login(client, "platform-admin@example.com", "AdminPass12")
    audit = await client.get("/api/v1/admin/audit-log")
    assert audit.status_code == 200
    actions = {row["action"] for row in audit.json()["items"]}
    assert "org.feature_flags.update" in actions
    assert "impersonation.start" in actions
    assert "impersonation.stop" in actions
    assert "org.suspend" in actions
