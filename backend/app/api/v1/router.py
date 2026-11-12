from fastapi import APIRouter

from app.api.v1.routes import (
    assistant,
    auth,
    health,
    jobs,
    notifications,
    org,
    overview,
    plans,
    public_collection,
    reports,
    reviewer_findings,
    surveys,
    users,
)
from app.api.v1.routes.admin import router as admin_router

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(org.router)
api_router.include_router(users.router)
api_router.include_router(admin_router)
api_router.include_router(notifications.router)
api_router.include_router(assistant.router)
api_router.include_router(overview.router)
api_router.include_router(plans.router)
api_router.include_router(surveys.router)
api_router.include_router(reports.router)
api_router.include_router(jobs.router)
api_router.include_router(reviewer_findings.router)
api_router.include_router(public_collection.router)
