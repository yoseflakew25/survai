"""Assistant threads, messages, and knowledge chunk repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.assistant import AssistantMessage, AssistantThread, OrgKnowledgeChunk
from app.repositories.base import BaseRepository


class AssistantThreadRepository(BaseRepository[AssistantThread]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AssistantThread)

    async def list_for_user(
        self, *, user_id: UUID, organization_id: UUID, limit: int = 50
    ) -> list[AssistantThread]:
        result = await self.session.execute(
            select(AssistantThread)
            .where(
                AssistantThread.user_id == user_id,
                AssistantThread.organization_id == organization_id,
            )
            .order_by(AssistantThread.updated_at.desc())
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_for_user(
        self, *, thread_id: UUID, user_id: UUID, organization_id: UUID
    ) -> AssistantThread | None:
        result = await self.session.execute(
            select(AssistantThread)
            .options(selectinload(AssistantThread.messages))
            .where(
                AssistantThread.id == thread_id,
                AssistantThread.user_id == user_id,
                AssistantThread.organization_id == organization_id,
            )
        )
        return result.scalar_one_or_none()


class AssistantMessageRepository(BaseRepository[AssistantMessage]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, AssistantMessage)

    async def list_for_thread(self, *, thread_id: UUID) -> list[AssistantMessage]:
        result = await self.session.execute(
            select(AssistantMessage)
            .where(AssistantMessage.thread_id == thread_id)
            .order_by(AssistantMessage.created_at.asc())
        )
        return list(result.scalars().all())


class KnowledgeChunkRepository(BaseRepository[OrgKnowledgeChunk]):
    def __init__(self, session: AsyncSession) -> None:
        super().__init__(session, OrgKnowledgeChunk)

    async def list_for_org(self, *, organization_id: UUID) -> list[OrgKnowledgeChunk]:
        result = await self.session.execute(
            select(OrgKnowledgeChunk).where(
                OrgKnowledgeChunk.organization_id == organization_id
            )
        )
        return list(result.scalars().all())

    async def get_by_source(
        self,
        *,
        organization_id: UUID,
        source_type: str,
        source_id: UUID,
    ) -> OrgKnowledgeChunk | None:
        result = await self.session.execute(
            select(OrgKnowledgeChunk).where(
                OrgKnowledgeChunk.organization_id == organization_id,
                OrgKnowledgeChunk.source_type == source_type,
                OrgKnowledgeChunk.source_id == source_id,
            )
        )
        return result.scalar_one_or_none()

    async def delete_by_source(
        self,
        *,
        organization_id: UUID,
        source_type: str,
        source_id: UUID,
    ) -> None:
        await self.session.execute(
            delete(OrgKnowledgeChunk).where(
                OrgKnowledgeChunk.organization_id == organization_id,
                OrgKnowledgeChunk.source_type == source_type,
                OrgKnowledgeChunk.source_id == source_id,
            )
        )
