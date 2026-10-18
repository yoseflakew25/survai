import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_update_me_profile_and_password(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "org@example.com",
            "password": "SecurePass1!",
            "organization_name": "DICDO",
        },
    )
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    updated = await client.patch(
        "/api/v1/users/me",
        headers=headers,
        json={
            "full_name": "DICDO Ops",
            "phone": "+251 911 000000",
            "job_title": "M&E",
            "bio": "Dire Integrated Community Development Organization",
            "organization_name": "DICDO Ethiopia",
            "organization_description": "Community development org",
            "organization_website": "https://dicdo.example.com",
        },
    )
    assert updated.status_code == 200, updated.text
    body = updated.json()
    assert body["full_name"] == "DICDO Ops"
    assert body["phone"] == "+251 911 000000"
    assert body["job_title"] == "M&E"
    assert body["organization_name"] == "DICDO Ethiopia"
    assert body["organization_description"] == "Community development org"
    assert body["organization_website"] == "https://dicdo.example.com"

    me = await client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["bio"].startswith("Dire")

    bad_pw = await client.post(
        "/api/v1/users/me/password",
        headers=headers,
        json={"current_password": "wrong", "new_password": "NewSecure1!"},
    )
    assert bad_pw.status_code == 401

    ok_pw = await client.post(
        "/api/v1/users/me/password",
        headers=headers,
        json={"current_password": "SecurePass1!", "new_password": "NewSecure1!"},
    )
    assert ok_pw.status_code == 204

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "org@example.com", "password": "NewSecure1!"},
    )
    assert login.status_code == 200


@pytest.mark.asyncio
async def test_delete_me_removes_organization(client: AsyncClient) -> None:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": "gone@example.com",
            "password": "SecurePass1!",
            "organization_name": "Temp Org",
        },
    )
    assert register.status_code == 201, register.text
    token = register.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    deleted = await client.delete("/api/v1/users/me", headers=headers)
    assert deleted.status_code == 204

    me = await client.get("/api/v1/users/me", headers=headers)
    assert me.status_code == 401

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "gone@example.com", "password": "SecurePass1!"},
    )
    assert login.status_code == 401
