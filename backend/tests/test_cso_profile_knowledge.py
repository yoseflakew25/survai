"""CSO profile → assistant knowledge chunks."""

from __future__ import annotations

from uuid import uuid4

from app.models.organization import Organization
from app.schemas.cso_profile import CsoLegalIdentity, CsoMission, OrganizationCsoProfile
from app.services.cso_profile_knowledge import (
    build_cso_profile_chunks,
    organization_context_payload,
)


def test_build_cso_profile_chunks_includes_overview_and_sections() -> None:
    org = Organization(
        name="Kebet Association",
        description="Women livelihoods NGO",
        website="https://example.org",
    )
    org.id = uuid4()
    org.cso_profile = OrganizationCsoProfile(
        legal=CsoLegalIdentity(legal_name="Kebet Association", year_founded=2010),
        mission=CsoMission(mission="Empower women farmers"),
    ).model_dump()

    chunks = build_cso_profile_chunks(org)
    keys = {row[0] for row in chunks}
    bodies = "\n".join(row[3] for row in chunks)
    assert "overview" in keys
    assert "legal" in keys
    assert "mission" in keys
    assert "Kebet" in bodies
    assert "Empower women" in bodies


def test_organization_context_payload_prunes_empty_fields() -> None:
    org = Organization(name="Test Org", description=None)
    org.id = uuid4()
    org.cso_profile = {}
    payload = organization_context_payload(org)
    assert payload.get("organization_name") == "Test Org"
    assert "organization_description" not in payload