from fastapi import APIRouter

from app.api.v1.routes import auth, health, plans, reviewer_findings, surveys, users

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(plans.router)
api_router.include_router(surveys.router)
api_router.include_router(reviewer_findings.router)
