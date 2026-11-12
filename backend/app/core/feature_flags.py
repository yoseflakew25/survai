"""Per-organization feature kill switches (system admin).

Missing key = enabled. Explicit ``False`` disables the feature.
"""

from __future__ import annotations

from typing import Final
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import ForbiddenError
from app.repositories.organization import OrganizationRepository

# Canonical flag keys for v1.
FEATURE_FLAG_KEYS: Final[tuple[str, ...]] = (
    "ai_planner",
    "ai_builder",
    "ai_reviewer",
    "ai_report",
    "ai_assistant",
    "publish_survey",
    "collect_responses",
    "exports",
)

FEATURE_FLAG_LABELS: Final[dict[str, str]] = {
    "ai_planner": "AI research planner",
    "ai_builder": "AI survey builder",
    "ai_reviewer": "AI reviewer",
    "ai_report": "AI reports",
    "ai_assistant": "Org assistant",
    "publish_survey": "Publish surveys",
    "collect_responses": "Collect responses",
    "exports": "Exports",
}


def flag_is_enabled(flags: dict | None, key: str) -> bool:
    if not flags:
        return True
    value = flags.get(key)
    if value is None:
        return True
    return bool(value) is not False and value is not False


def default_flags_map(flags: dict | None = None) -> dict[str, bool]:
    current = flags or {}
    return {key: flag_is_enabled(current, key) for key in FEATURE_FLAG_KEYS}


async def org_flag_enabled(
    session: AsyncSession, *, organization_id: UUID | None, key: str
) -> bool:
    if organization_id is None:
        return True
    org = await OrganizationRepository(session).get_by_id(organization_id)
    if org is None:
        return True
    if not org.is_active:
        return False
    return flag_is_enabled(org.feature_flags, key)


async def assert_org_flag(
    session: AsyncSession, *, organization_id: UUID | None, key: str
) -> None:
    if await org_flag_enabled(session, organization_id=organization_id, key=key):
        return
    label = FEATURE_FLAG_LABELS.get(key, key)
    raise ForbiddenError(
        f"{label} is disabled for this organization. Contact SurvAI support."
    )
