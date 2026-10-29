"""Organization overview dashboard."""

from __future__ import annotations

from fastapi import APIRouter

from app.api.deps import CurrentUser, OverviewServiceDep
from app.schemas.overview import OverviewResponse

router = APIRouter(prefix="/overview", tags=["overview"])


@router.get("", response_model=OverviewResponse)
async def get_overview(
    current_user: CurrentUser,
    overview: OverviewServiceDep,
) -> OverviewResponse:
    return await overview.get_overview(user=current_user)
