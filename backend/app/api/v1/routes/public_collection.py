"""Unauthenticated public collection routes (COL-01–05)."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Header, Request

from app.api.deps import CollectionServiceDep
from app.schemas.collection import (
    AnswerUpsertBody,
    CompleteBody,
    PublicSubmitBody,
    PublicSurveyOut,
    RespondentPublic,
    SubmitSurveyBody,
)

router = APIRouter(prefix="/public", tags=["public-collection"])


@router.get("/surveys/{version_id}", response_model=PublicSurveyOut)
async def get_public_survey(
    version_id: UUID,
    collection: CollectionServiceDep,
) -> PublicSurveyOut:
    """``version_id`` path param accepts survey id (canonical) or a version id.

    Both resolve to the survey's current published version — one live form.
    """
    return await collection.get_public_survey(version_id=version_id)


@router.post("/surveys/{version_id}/respondents")
async def start_respondent(
    version_id: UUID,
    request: Request,
    collection: CollectionServiceDep,
    user_agent: Annotated[str | None, Header()] = None,
) -> dict[str, str]:
    """Check that collection is open. Does not create a respondent row."""
    client = request.client.host if request.client else None
    return await collection.start_respondent(
        version_id=version_id,
        ip=client,
        user_agent=user_agent,
    )


@router.post(
    "/surveys/{version_id}/submit",
    response_model=RespondentPublic,
)
async def submit_public_survey(
    version_id: UUID,
    body: PublicSubmitBody,
    request: Request,
    collection: CollectionServiceDep,
    user_agent: Annotated[str | None, Header()] = None,
) -> RespondentPublic:
    """Save a finished response only — no partial rows."""
    client = request.client.host if request.client else None
    return await collection.submit_public_survey(
        version_id=version_id,
        answers=[(item.question_id, item.value) for item in body.answers],
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
    "/respondents/{respondent_id}/submit",
    response_model=RespondentPublic,
)
async def submit_survey(
    respondent_id: UUID,
    body: SubmitSurveyBody,
    collection: CollectionServiceDep,
) -> RespondentPublic:
    """Save all answers and complete in one request (COL public submit)."""
    return await collection.submit_survey(
        respondent_id=respondent_id,
        session_token=body.session_token,
        answers=[(item.question_id, item.value) for item in body.answers],
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
