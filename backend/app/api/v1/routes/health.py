from fastapi import APIRouter

router = APIRouter(tags=["health"])


# UptimeRobot (and many uptime tools) probe with HEAD by default.
@router.api_route("/health", methods=["GET", "HEAD"])
async def health() -> dict[str, str]:
    return {"status": "ok"}
