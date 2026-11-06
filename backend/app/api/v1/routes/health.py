from fastapi import APIRouter

from app.jobs.queue import get_arq_pool, jobs_enabled

router = APIRouter(tags=["health"])


# UptimeRobot (and many uptime tools) probe with HEAD by default.
@router.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, object]:
    """Liveness plus optional Redis/ARQ readiness for pilot polish."""
    jobs: dict[str, object] = {
        "enabled": jobs_enabled(),
        "redis": "disabled",
    }
    if jobs_enabled():
        try:
            pool = await get_arq_pool()
            if pool is None:
                jobs["redis"] = "error"
                jobs["detail"] = "Queue enabled but pool unavailable"
            else:
                # ArqRedis subclasses redis.asyncio.Redis
                pong = await pool.ping()
                jobs["redis"] = "ok" if pong else "error"
        except Exception as exc:  # noqa: BLE001 — surface in health only
            jobs["redis"] = "error"
            jobs["detail"] = str(exc)[:200]

    return {"status": "ok", "jobs": jobs}
