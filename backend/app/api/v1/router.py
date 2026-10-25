from fastapi import APIRouter

from app.api.v1.routes import (
    auth,
    health,
    plans,
    public_collection,
    reports,
    reviewer_findings,
    surveys,
    users,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(plans.router)
api_router.include_router(surveys.router)
api_router.include_router(reports.router)
api_router.include_router(reviewer_findings.router)
api_router.include_router(public_collection.router)
