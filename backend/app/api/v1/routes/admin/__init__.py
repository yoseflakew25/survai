"""System-admin platform routes under /api/v1/admin."""

from fastapi import APIRouter

from app.api.v1.routes.admin import ai_logs, audit, health, impersonate, orgs, overview, users

router = APIRouter(prefix="/admin", tags=["admin"])
router.include_router(overview.router)
router.include_router(orgs.router)
router.include_router(users.router)
router.include_router(audit.router)
router.include_router(ai_logs.router)
router.include_router(impersonate.router)
router.include_router(health.router)
