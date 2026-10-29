import pytest
from httpx import AsyncClient


async def _register_and_verify(
    client: AsyncClient,
    *,
    email: str,
    password: str,
    organization_name: str,
    code: str = "123456",
) -> dict:
    register = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": password,
            "organization_name": organization_name,
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
async def test_register_verify_login_me_refresh_logout(
    client: AsyncClient, fixed_otp: str
) -> None:
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
    assert body["email"] == "ops@dicdo.example.com"
    assert "access_token" not in body

    blocked = await client.post(
        "/api/v1/auth/login",
        json={"email": "ops@dicdo.example.com", "password": "SecurePass1!"},
    )
    assert blocked.status_code == 401

    verify = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": "ops@dicdo.example.com", "code": fixed_otp},
    )
    assert verify.status_code == 200, verify.text
    tokens = verify.json()
    assert tokens["token_type"] == "bearer"
    assert tokens["user"]["email"] == "ops@dicdo.example.com"
    assert tokens["user"]["organization_name"] == "DICDO"
    assert tokens["user"]["role"] == "organization"
    assert tokens["user"]["email_verified"] is True
    assert tokens["access_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
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
async def test_login_wrong_password(client: AsyncClient, fixed_otp: str) -> None:
    await _register_and_verify(
        client,
        email="ops@acme.example.com",
        password="SecurePass1!",
        organization_name="Acme Org",
        code=fixed_otp,
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
    body = response.json()
    assert "reset" in body["message"].lower() or "registered" in body["message"].lower()
    assert body.get("dev_reset_url") in (None, "")

    bad_reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": "not-a-real-token", "new_password": "NewPassword1!"},
    )
    assert bad_reset.status_code == 400


@pytest.mark.asyncio
async def test_forgot_password_reset_and_login(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = "reset@example.com"
    old_password = "SecurePass1!"
    new_password = "BrandNewPass2!"
    await _register_and_verify(
        client,
        email=email,
        password=old_password,
        organization_name="Reset Org",
        code=fixed_otp,
    )

    captured: dict[str, str] = {}

    async def _capture_reset(*, to_email: str, reset_token: str) -> None:
        captured["email"] = to_email
        captured["token"] = reset_token

    monkeypatch.setattr(
        "app.services.auth.email_delivery_configured",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.auth.send_password_reset_email",
        _capture_reset,
    )

    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    assert captured.get("email") == email
    assert captured.get("token")
    assert forgot.json().get("dev_reset_url") in (None, "")

    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": captured["token"], "new_password": new_password},
    )
    assert reset.status_code == 200, reset.text

    old_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": old_password},
    )
    assert old_login.status_code == 401

    new_login = await client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": new_password},
    )
    assert new_login.status_code == 200
    assert new_login.json()["user"]["email"] == email


@pytest.mark.asyncio
async def test_forgot_password_surfaces_delivery_failure(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = "reset-fail@example.com"
    await _register_and_verify(
        client,
        email=email,
        password="SecurePass1!",
        organization_name="Reset Fail Org",
        code=fixed_otp,
    )

    async def _boom(*, to_email: str, reset_token: str) -> None:
        from app.services.email import EmailDeliveryError

        raise EmailDeliveryError("SMTP down")

    monkeypatch.setattr(
        "app.services.auth.email_delivery_configured",
        lambda: True,
    )
    monkeypatch.setattr(
        "app.services.auth.send_password_reset_email",
        _boom,
    )

    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 400
    detail = forgot.json()["detail"].lower()
    assert "reset email" in detail
    assert "smtp down" in detail


@pytest.mark.asyncio
async def test_forgot_password_dev_reset_url_without_email(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = "reset-dev@example.com"
    await _register_and_verify(
        client,
        email=email,
        password="SecurePass1!",
        organization_name="Reset Dev Org",
        code=fixed_otp,
    )

    monkeypatch.setattr(
        "app.services.auth.email_delivery_configured",
        lambda: False,
    )

    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 200
    body = forgot.json()
    assert body.get("dev_reset_url")
    assert "token=" in body["dev_reset_url"]

    token = body["dev_reset_url"].split("token=", 1)[1]
    reset = await client.post(
        "/api/v1/auth/reset-password",
        json={"token": token, "new_password": "BrandNewPass2!"},
    )
    assert reset.status_code == 200, reset.text


@pytest.mark.asyncio
async def test_forgot_password_production_requires_email_delivery(
    client: AsyncClient, fixed_otp: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    email = "reset-prod@example.com"
    await _register_and_verify(
        client,
        email=email,
        password="SecurePass1!",
        organization_name="Reset Prod Org",
        code=fixed_otp,
    )

    monkeypatch.setattr("app.core.config.settings.environment", "production")
    monkeypatch.setattr(
        "app.services.auth.email_delivery_configured",
        lambda: False,
    )

    forgot = await client.post(
        "/api/v1/auth/forgot-password",
        json={"email": email},
    )
    assert forgot.status_code == 400
    assert "smtp" in forgot.json()["detail"].lower() or "resend" in forgot.json()[
        "detail"
    ].lower()


@pytest.mark.asyncio
async def test_verify_email_bad_code(client: AsyncClient, fixed_otp: str) -> None:
    await client.post(
        "/api/v1/auth/register",
        json={
            "email": "otp@example.com",
            "password": "SecurePass1!",
            "organization_name": "OTP Org",
        },
    )
    bad = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": "otp@example.com", "code": "000000"},
    )
    assert bad.status_code == 400
    # Correct code still works after a failed attempt
    ok = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": "otp@example.com", "code": fixed_otp},
    )
    assert ok.status_code == 200


@pytest.mark.asyncio
async def test_verify_email_already_verified_does_not_issue_tokens(
    client: AsyncClient, fixed_otp: str
) -> None:
    email = "already@example.com"
    await _register_and_verify(
        client,
        email=email,
        password="SecurePass1!",
        organization_name="Already Org",
        code=fixed_otp,
    )
    replay = await client.post(
        "/api/v1/auth/verify-email",
        json={"email": email, "code": "000000"},
    )
    assert replay.status_code == 400
    body = replay.json()
    assert "access_token" not in body
    assert "already verified" in body["detail"].lower()
