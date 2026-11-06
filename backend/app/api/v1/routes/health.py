from fastapi import APIRouter

from app.core.config import settings
from app.jobs.queue import get_arq_pool, jobs_enabled

router = APIRouter(tags=["health"])


# UptimeRobot (and many uptime tools) probe with HEAD by default.
@router.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, object]:
    """Liveness. Redis/ARQ is optional and never fails the health check."""
    jobs: dict[str, object] = {
        "enabled": False,
        "mode": "inline",
        "redis": "disabled",
        "opt_in": bool(settings.jobs_use_redis),
    }
    if jobs_enabled():
        jobs["enabled"] = True
        jobs["mode"] = "queue"
        try:
            pool = await get_arq_pool()
            if pool is None:
                # Soft-fail: API stays healthy; callers use inline.
                jobs["enabled"] = False
                jobs["mode"] = "inline"
                jobs["redis"] = "error"
                jobs["detail"] = "Queue opted in but pool unavailable — using inline"
            else:
                pong = await pool.ping()
                jobs["redis"] = "ok" if pong else "error"
                if not pong:
                    jobs["enabled"] = False
                    jobs["mode"] = "inline"
        except Exception as exc:  # noqa: BLE001 — health must not 500
            jobs["enabled"] = False
            jobs["mode"] = "inline"
            jobs["redis"] = "error"
            jobs["detail"] = str(exc)[:200]

    return {"status": "ok", "jobs": jobs}
