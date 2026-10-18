"""Unauthenticated public collection routes (COL-01–05)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Request

from app.api.deps import CollectionServiceDep
from app.schemas.collection import (
    AnswerUpsertBody,
    CompleteBody,
    PublicSurveyOut,
    RespondentPublic,
)

router = APIRouter(prefix="/public", tags=["public-collection"])


@router.get("/surveys/{version_id}", response_model=PublicSurveyOut)
async def get_public_survey(
    version_id: UUID,
    collection: CollectionServiceDep,
) -> PublicSurveyOut:
    return await collection.get_public_survey(version_id=version_id)


@router.post(
    "/surveys/{version_id}/respondents",
    response_model=RespondentPublic,
)
async def start_respondent(
    version_id: UUID,
    request: Request,
    collection: CollectionServiceDep,
    user_agent: Annotated[str | None, Header()] = None,
) -> RespondentPublic:
    client = request.client.host if request.client else None
    return await collection.start_respondent(
        version_id=version_id,
        ip=client,
        user_agent=user_agent,
    )


@router.post("/respondents/{respondent_id}/answers")
async def upsert_answer(
    respondent_id: UUID,
    body: AnswerUpsertBody,
    collection: CollectionServiceDep,
) -> dict[str, str]:
    return await collection.upsert_answer(
        respondent_id=respondent_id,
        session_token=body.session_token,
        question_id=body.question_id,
        value=body.value,
    )


@router.post(
    "/respondents/{respondent_id}/complete",
    response_model=RespondentPublic,
)
async def complete_response(
    respondent_id: UUID,
    body: CompleteBody,
    collection: CollectionServiceDep,
) -> RespondentPublic:
    return await collection.complete(respondent_id=respondent_id, body=body)
