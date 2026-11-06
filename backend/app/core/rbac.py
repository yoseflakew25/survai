"""Org seat RBAC — Owner (organization), Researcher, Viewer."""

from __future__ import annotations

from app.core.exceptions import ForbiddenError
from app.models.user import User, UserRole

# Signup / org creator — can invite and manage billing-style settings.
OWNER_ROLES = frozenset({UserRole.organization})
# Can mutate surveys, publish, generate reports.
EDITOR_ROLES = frozenset({UserRole.organization, UserRole.researcher})
# Any logged-in org seat (incl. read-only).
MEMBER_ROLES = frozenset(
    {UserRole.organization, UserRole.researcher, UserRole.viewer}
)
INVITEABLE_ROLES = frozenset({UserRole.researcher, UserRole.viewer})


def is_org_owner(user: User) -> bool:
    if user.is_superuser:
        return True
    return user.role in OWNER_ROLES


def is_org_editor(user: User) -> bool:
    if user.is_superuser:
        return True
    return user.role in EDITOR_ROLES


def is_org_member(user: User) -> bool:
    if user.is_superuser:
        return True
    return user.role in MEMBER_ROLES and user.organization_id is not None


def require_org_owner(user: User) -> None:
    if not is_org_owner(user):
        raise ForbiddenError("Only the organization owner can do that")


def require_org_editor(user: User) -> None:
    if not is_org_editor(user):
        raise ForbiddenError("Viewers cannot change surveys or generate reports")
