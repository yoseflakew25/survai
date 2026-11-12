"""Write platform audit events (system admin + sensitive mutations)."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_log import AuditLog
from app.models.user import User


async def record_audit(
    session: AsyncSession,
    *,
    actor: User | None,
    action: str,
    resource_type: str,
    resource_id: UUID | None = None,
    organization_id: UUID | None = None,
    metadata: dict[str, Any] | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    commit: bool = False,
) -> AuditLog:
    row = AuditLog(
        actor_user_id=actor.id if actor is not None else None,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        organization_id=organization_id,
        meta=metadata,
        ip=ip,
        user_agent=user_agent,
    )
    session.add(row)
    await session.flush()
    if commit:
        await session.commit()
    return row
