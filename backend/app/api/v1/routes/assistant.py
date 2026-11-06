"""Org assistant threads, messages, and knowledge reindex."""

from __future__ import annotations

import json
from collections.abc import AsyncIterator
from uuid import UUID

from fastapi import APIRouter, Response, status
from fastapi.responses import StreamingResponse

from app.api.deps import AssistantServiceDep, CurrentUser
from app.core.exceptions import AppError
from app.schemas.assistant import (
    AssistantMessageCreate,
    AssistantMessageListResponse,
    AssistantSendResponse,
    AssistantThreadCreate,
    AssistantThreadListResponse,
    AssistantThreadPublic,
    AssistantThreadUpdate,
    KnowledgeReindexResponse,
)

router = APIRouter(prefix="/assistant", tags=["assistant"])


@router.get("/threads", response_model=AssistantThreadListResponse)
async def list_threads(
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantThreadListResponse:
    return await assistant.list_threads(user=current_user)


@router.post(
    "/threads",
    response_model=AssistantThreadPublic,
    status_code=status.HTTP_201_CREATED,
)
async def create_thread(
    body: AssistantThreadCreate,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantThreadPublic:
    return await assistant.create_thread(user=current_user, title=body.title)


@router.get("/threads/{thread_id}", response_model=AssistantThreadPublic)
async def get_thread(
    thread_id: UUID,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantThreadPublic:
    return await assistant.get_thread(user=current_user, thread_id=thread_id)


@router.patch("/threads/{thread_id}", response_model=AssistantThreadPublic)
async def update_thread(
    thread_id: UUID,
    body: AssistantThreadUpdate,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantThreadPublic:
    return await assistant.update_thread(
        user=current_user, thread_id=thread_id, body=body
    )


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: UUID,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> Response:
    await assistant.delete_thread(user=current_user, thread_id=thread_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/threads/{thread_id}/messages",
    response_model=AssistantMessageListResponse,
)
async def list_messages(
    thread_id: UUID,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantMessageListResponse:
    return await assistant.list_messages(user=current_user, thread_id=thread_id)


@router.post(
    "/threads/{thread_id}/messages",
    response_model=AssistantSendResponse,
)
async def send_message(
    thread_id: UUID,
    body: AssistantMessageCreate,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> AssistantSendResponse:
    return await assistant.send_message(
        user=current_user, thread_id=thread_id, content=body.content
    )


@router.post("/threads/{thread_id}/messages/stream")
async def send_message_stream(
    thread_id: UUID,
    body: AssistantMessageCreate,
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> StreamingResponse:
    """SSE progress + progressive answer text; final `done` carries full messages."""

    async def event_gen() -> AsyncIterator[str]:
        try:
            async for event, payload in assistant.iter_send_message(
                user=current_user,
                thread_id=thread_id,
                content=body.content,
                stream_deltas=True,
            ):
                if event == "done":
                    assert isinstance(payload, AssistantSendResponse)
                    data = payload.model_dump(mode="json")
                else:
                    data = payload
                yield f"event: {event}\ndata: {json.dumps(data)}\n\n"
        except AppError as exc:
            yield (
                "event: error\n"
                f"data: {json.dumps({'detail': exc.detail, 'status_code': exc.status_code})}\n\n"
            )
        except Exception:
            yield (
                "event: error\n"
                f"data: {json.dumps({'detail': 'Assistant stream failed'})}\n\n"
            )

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/knowledge/reindex", response_model=KnowledgeReindexResponse)
async def reindex_knowledge(
    current_user: CurrentUser,
    assistant: AssistantServiceDep,
) -> KnowledgeReindexResponse:
    return await assistant.reindex_org(user=current_user)
