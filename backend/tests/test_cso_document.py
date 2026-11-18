"""CSO profile document text extraction and upload route."""

from __future__ import annotations

import io
import zipfile
from uuid import uuid4
from xml.sax.saxutils import escape

import pytest
from httpx import AsyncClient

from app.ai.client import StructuredCallResult
from app.schemas.cso_profile import (
    CsoLegalIdentity,
    CsoMission,
    CsoProfileExtractionOutput,
    OrganizationCsoProfile,
)
from app.services.cso_document import extract_document_text
from tests.test_dicdo_features import _register_and_verify


def _minimal_docx(paragraphs: list[str]) -> bytes:
    body = ""
    for line in paragraphs:
        body += (
            f"<w:p><w:r><w:t xml:space=\"preserve\">{escape(line)}</w:t></w:r></w:p>"
        )
    document_xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
        f"<w:body>{body}</w:body></w:document>"
    )
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("word/document.xml", document_xml)
    return buf.getvalue()


def test_extract_document_text_from_docx() -> None:
    raw = _minimal_docx(
        [
            "Kebet Association",
            "Mission: improve livelihoods for women farmers.",
        ]
    )
    text = extract_document_text(filename="profile.docx", data=raw)
    assert "Kebet Association" in text
    assert "livelihoods" in text


@pytest.mark.asyncio
async def test_extract_profile_route_owner_only(
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
    headers = {"Authorization": f"Bearer {owner['access_token']}"}

    profile = OrganizationCsoProfile(
        legal=CsoLegalIdentity(legal_name="Kebet Association"),
        mission=CsoMission(mission="Women livelihoods"),
    )
    fake = CsoProfileExtractionOutput(
        organization_name="Kebet Association",
        organization_description="Women-led livelihood NGO",
        profile=profile,
    )

    async def _fake_call_structured(**kwargs):
        return StructuredCallResult(
            value=fake,
            model="test:fake",
            prompt_version="cso_profile_extract_v1",
            request_id="test",
            latency_ms=1,
        )

    monkeypatch.setattr(
        "app.services.cso_document.call_structured",
        _fake_call_structured,
    )

    docx = _minimal_docx(
        [
            "Kebet Association profile",
            "We work on livelihoods for women farmers across Oromia.",
        ]
    )
    res = await client.post(
        "/api/v1/users/me/organization-profile/from-document",
        headers=headers,
        files={
            "file": (
                "org.docx",
                docx,
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            )
        },
    )
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["organization_name"] == "Kebet Association"
    assert body["organization_cso_profile"]["legal"]["legal_name"] == "Kebet Association"
    assert body["characters_extracted"] > 40


@pytest.mark.asyncio
async def test_extract_profile_route_viewer_forbidden(
    client: AsyncClient,
    fixed_otp: str,
) -> None:
    from urllib.parse import parse_qs, urlparse

    owner = await _register_and_verify(
        client,
        email=f"owner2-{uuid4().hex[:8]}@example.com",
        password="SecurePass1!",
        code=fixed_otp,
    )
    owner_headers = {"Authorization": f"Bearer {owner['access_token']}"}

    invite = await client.post(
        "/api/v1/org/invites",
        headers=owner_headers,
        json={"email": f"viewer-{uuid4().hex[:8]}@example.com", "role": "viewer"},
    )
    assert invite.status_code == 201, invite.text
    token = parse_qs(urlparse(invite.json()["dev_invite_url"]).query)["token"][0]
    viewer = await client.post(
        "/api/v1/auth/accept-invite",
        json={
            "token": token,
            "full_name": "Viewer",
            "password": "SecurePass1!",
        },
    )
    viewer_headers = {"Authorization": f"Bearer {viewer.json()['access_token']}"}

    docx = _minimal_docx(["Some NGO text for extraction testing purposes here."])
    blocked = await client.post(
        "/api/v1/users/me/organization-profile/from-document",
        headers=viewer_headers,
        files={"file": ("x.docx", docx, "application/octet-stream")},
    )
    assert blocked.status_code == 403, blocked.text