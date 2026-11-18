"""Serialize organization / CSO profile for assistant RAG and prompts."""

from __future__ import annotations

import uuid
from typing import Any

from app.models.organization import Organization
from app.schemas.cso_profile import OrganizationCsoProfile, parse_cso_profile

_CS0_PROFILE_NS = uuid.UUID("8e2f1b4c-9a3d-4e5f-b6c7-d8e9f0a1b2c3")

_SECTION_SPECS: tuple[tuple[str, str, str], ...] = (
    ("legal", "CSO profile — Legal & registration", "legal"),
    ("mission", "CSO profile — Mission & theory of change", "mission"),
    ("geography", "CSO profile — Geography & reach", "geography"),
    ("programs", "CSO profile — Programs & themes", "programs"),
    ("stakeholders", "CSO profile — Partners & funders", "stakeholders"),
    ("me_capacity", "CSO profile — M&E & research practice", "me_capacity"),
    ("languages", "CSO profile — Languages & inclusion", "languages"),
    ("governance", "CSO profile — Governance & staffing", "governance"),
    ("ethics", "CSO profile — Data ethics & AI boundaries", "ethics"),
)


def cso_section_source_id(organization_id: uuid.UUID, section_key: str) -> uuid.UUID:
    return uuid.uuid5(_CS0_PROFILE_NS, f"{organization_id}:{section_key}")


def _field_lines(model: Any, *, labels: dict[str, str] | None = None) -> list[str]:
    labels = labels or {}
    lines: list[str] = []
    if model is None:
        return lines
    data = model.model_dump() if hasattr(model, "model_dump") else {}
    for key, value in data.items():
        if value is None or value == "":
            continue
        label = labels.get(key, key.replace("_", " ").strip().title())
        lines.append(f"{label}: {value}")
    return lines


def build_cso_profile_chunks(
    org: Organization,
) -> list[tuple[str, uuid.UUID, str, str]]:
    """Return (section_key, source_id, title, body) rows to index."""
    profile = parse_cso_profile(org.cso_profile)
    out: list[tuple[str, uuid.UUID, str, str]] = []

    overview_parts: list[str] = []
    if (org.name or "").strip():
        overview_parts.append(f"Organization name: {org.name.strip()}")
    if (org.description or "").strip():
        overview_parts.append(f"Public summary: {org.description.strip()}")
    if (org.website or "").strip():
        overview_parts.append(f"Website: {org.website.strip()}")
    if overview_parts:
        out.append(
            (
                "overview",
                cso_section_source_id(org.id, "overview"),
                "Organization overview",
                "\n".join(overview_parts),
            )
        )

    for section_key, title, attr in _SECTION_SPECS:
        section = getattr(profile, attr, None)
        body = "\n".join(_field_lines(section))
        if not body.strip():
            continue
        out.append(
            (
                section_key,
                cso_section_source_id(org.id, section_key),
                title,
                body,
            )
        )

    if (profile.additional_context or "").strip():
        out.append(
            (
                "additional",
                cso_section_source_id(org.id, "additional"),
                "CSO profile — Additional context",
                profile.additional_context.strip(),
            )
        )

    return out


def organization_context_payload(org: Organization | None) -> dict[str, Any]:
    """Compact org + CSO profile for every assistant turn (not only RAG hits)."""
    if org is None:
        return {}
    profile = parse_cso_profile(org.cso_profile)
    payload: dict[str, Any] = {
        "organization_name": org.name,
        "organization_description": org.description,
        "organization_website": org.website,
        "cso_profile": _compact_profile(profile),
    }
    return {k: v for k, v in payload.items() if v not in (None, "", {}, [])}


def _compact_profile(profile: OrganizationCsoProfile) -> dict[str, Any]:
    raw = profile.model_dump()
    out: dict[str, Any] = {}
    for section, fields in raw.items():
        if section == "additional_context":
            if fields:
                out["additional_context"] = fields
            continue
        if not isinstance(fields, dict):
            continue
        pruned = {k: v for k, v in fields.items() if v not in (None, "")}
        if pruned:
            out[section] = pruned
    return out