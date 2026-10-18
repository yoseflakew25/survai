import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_login_me_refresh_logout(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "ops@dicdo.example.com",
            "password": "SecurePass1!",
            "organization_name": "DICDO",
        },
    )
    assert register.status_code == 201, register.text
    body = register.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == "ops@dicdo.example.com"
    assert body["user"]["organization_name"] == "DICDO"
    assert body["user"]["full_name"] == "DICDO"
    assert body["user"]["role"] == "organization"
    assert body["access_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {body['access_token']}"},
    )
    assert me.status_code == 200
    assert me.json()["organization_name"] == "DICDO"

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "ops@dicdo.example.com", "password": "SecurePass1!"},
    )
    assert login.status_code == 200
    refresh_cookie = login.cookies.get("refresh_token") or login.json()["refresh_token"]

    client.cookies.set("refresh_token", refresh_cookie)
    refreshed = await client.post("/api/v1/auth/refresh")
    assert refreshed.status_code == 200
    assert refreshed.json()["access_token"]

    logout = await client.post("/api/v1/auth/logout")
    assert logout.status_code == 200


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "ops@acme.example.com",
            "password": "SecurePass1!",
            "organization_name": "Acme Org",
        },
    )
    bad = await client.post(
        "/api/v1/auth/login",
        json={"email": "ops@acme.example.com", "password": "wrong-password"},
    )
    assert bad.status_code == 401


@pytest.mark.asyncio
async def test_forgot_password_no_enumeration(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": "missing@example.com"},
    )
    assert response.status_code == 200
    assert "reset" in response.json()["message"].lower()

    bad_reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "NewPassword1!"},
    )
    assert bad_reset.status_code == 400
