"""Surveys — CRUD + Gemini builder generate / section regenerate."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Response, status

from app.api.deps import (
    CollectionServiceDep,
    CurrentUser,
    ReviewerServiceDep,
    SurveyServiceDep,
)
from app.schemas.collection import CollectStatsPublic, PublishResponse
from app.schemas.reviewer import ReviewerReportPublic
from app.schemas.survey import (
    QuestionCreate,
    QuestionPublic,
    QuestionReorder,
    QuestionUpdate,
    SectionCreate,
    SectionPublic,
    SectionReorder,
    SectionUpdate,
    SurveyCreate,
    SurveyCreateFromPlan,
    SurveyGenerateResponse,
    SurveyListResponse,
    SurveyPublic,
    SurveyUpdate,
)

router = APIRouter(prefix="/surveys", tags=["surveys"])


@router.get("", response_model=SurveyListResponse)
async def list_surveys(
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyListResponse:
    return await surveys.list_surveys(user=current_user)


@router.post("", response_model=SurveyPublic, status_code=status.HTTP_201_CREATED)
async def create_survey(
    body: SurveyCreate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyPublic:
    return await surveys.create_survey(user=current_user, body=body)


@router.post(
    "/from-plan",
    response_model=SurveyGenerateResponse,
)
async def create_survey_from_plan(
    body: SurveyCreateFromPlan,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
    response: Response,
) -> SurveyGenerateResponse:
    """Get-or-create the survey for a plan (1:1); generate hard-replaces questions."""
    payload, created = await surveys.create_from_plan(
        user=current_user, body=body
    )
    response.status_code = (
        status.HTTP_201_CREATED if created else status.HTTP_200_OK
    )
    return payload


@router.get("/{survey_id}", response_model=SurveyPublic)
async def get_survey(
    survey_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyPublic:
    return await surveys.get_survey(user=current_user, survey_id=survey_id)


@router.patch("/{survey_id}", response_model=SurveyPublic)
async def update_survey(
    survey_id: UUID,
    body: SurveyUpdate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyPublic:
    return await surveys.update_survey(
        user=current_user, survey_id=survey_id, body=body
    )


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_survey(
    survey_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> Response:
    await surveys.delete_survey(user=current_user, survey_id=survey_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{survey_id}/generate", response_model=SurveyGenerateResponse)
async def generate_survey(
    survey_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyGenerateResponse:
    """Hard-replace sections/questions from the linked plan (BLD-01)."""
    return await surveys.generate(user=current_user, survey_id=survey_id)


@router.post("/{survey_id}/publish", response_model=PublishResponse)
async def publish_survey(
    survey_id: UUID,
    current_user: CurrentUser,
    collection: CollectionServiceDep,
) -> PublishResponse:
    """Freeze questionnaire into a survey_version and open collection (COL-01)."""
    return await collection.publish(user=current_user, survey_id=survey_id)


@router.post("/{survey_id}/close", response_model=CollectStatsPublic)
async def close_survey(
    survey_id: UUID,
    current_user: CurrentUser,
    collection: CollectionServiceDep,
) -> CollectStatsPublic:
    """Stop accepting new respondents."""
    return await collection.close(user=current_user, survey_id=survey_id)


@router.get("/{survey_id}/collect-stats", response_model=CollectStatsPublic)
async def collect_stats(
    survey_id: UUID,
    current_user: CurrentUser,
    collection: CollectionServiceDep,
) -> CollectStatsPublic:
    """Completed response count + public collection path."""
    return await collection.get_stats(user=current_user, survey_id=survey_id)


@router.post("/{survey_id}/review", response_model=ReviewerReportPublic)
async def run_survey_review(
    survey_id: UUID,
    current_user: CurrentUser,
    reviewer: ReviewerServiceDep,
) -> ReviewerReportPublic:
    """Run Gemini quality review (REV-01–06). Creates a new report + findings."""
    return await reviewer.run_review(user=current_user, survey_id=survey_id)


@router.get("/{survey_id}/review/latest", response_model=ReviewerReportPublic | None)
async def get_latest_review(
    survey_id: UUID,
    current_user: CurrentUser,
    reviewer: ReviewerServiceDep,
) -> ReviewerReportPublic | None:
    """Latest reviewer report for this survey, or null if none yet."""
    return await reviewer.get_latest(user=current_user, survey_id=survey_id)


@router.post(
    "/{survey_id}/sections/{section_id}/regenerate",
    response_model=SurveyGenerateResponse,
)
async def regenerate_section(
    survey_id: UUID,
    section_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyGenerateResponse:
    """Hard-replace one section's questions (BLD-02)."""
    return await surveys.regenerate_section_ai(
        user=current_user, survey_id=survey_id, section_id=section_id
    )


@router.post(
    "/{survey_id}/sections",
    response_model=SectionPublic,
    status_code=status.HTTP_201_CREATED,
)
async def add_section(
    survey_id: UUID,
    body: SectionCreate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SectionPublic:
    return await surveys.add_section(
        user=current_user, survey_id=survey_id, body=body
    )


@router.patch("/{survey_id}/sections/{section_id}", response_model=SectionPublic)
async def update_section(
    survey_id: UUID,
    section_id: UUID,
    body: SectionUpdate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SectionPublic:
    return await surveys.update_section(
        user=current_user,
        survey_id=survey_id,
        section_id=section_id,
        body=body,
    )


@router.delete(
    "/{survey_id}/sections/{section_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_section(
    survey_id: UUID,
    section_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> Response:
    await surveys.delete_section(
        user=current_user, survey_id=survey_id, section_id=section_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{survey_id}/sections/reorder", response_model=SurveyPublic)
async def reorder_sections(
    survey_id: UUID,
    body: SectionReorder,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyPublic:
    return await surveys.reorder_sections(
        user=current_user, survey_id=survey_id, body=body
    )


@router.post(
    "/{survey_id}/questions",
    response_model=QuestionPublic,
    status_code=status.HTTP_201_CREATED,
)
async def add_question(
    survey_id: UUID,
    body: QuestionCreate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> QuestionPublic:
    return await surveys.add_question(
        user=current_user, survey_id=survey_id, body=body
    )


@router.patch("/{survey_id}/questions/{question_id}", response_model=QuestionPublic)
async def update_question(
    survey_id: UUID,
    question_id: UUID,
    body: QuestionUpdate,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> QuestionPublic:
    return await surveys.update_question(
        user=current_user,
        survey_id=survey_id,
        question_id=question_id,
        body=body,
    )


@router.delete(
    "/{survey_id}/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_question(
    survey_id: UUID,
    question_id: UUID,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> Response:
    await surveys.delete_question(
        user=current_user, survey_id=survey_id, question_id=question_id
    )
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{survey_id}/questions/reorder", response_model=SurveyPublic)
async def reorder_questions(
    survey_id: UUID,
    body: QuestionReorder,
    current_user: CurrentUser,
    surveys: SurveyServiceDep,
) -> SurveyPublic:
    return await surveys.reorder_questions(
        user=current_user, survey_id=survey_id, body=body
    )
