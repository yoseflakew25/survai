# Redis + ARQ (optional)

**SurvAI does not require Redis.** Report generate/export run **inline** on the
API process by default (`JOBS_USE_REDIS=false`).

Set both only when you explicitly want a background queue:

```bash
JOBS_USE_REDIS=true
REDIS_URL=rediss://default:…@….upstash.io:6379   # TLS URL
```

Then create/export may return **202** + `job_id`; the frontend polls
`GET /api/v1/jobs/{job_id}`. `scripts/start.sh` starts an in-process ARQ worker.

If Redis is missing, exhausted, or unreachable, enqueue fails soft and the API
**falls back to inline** — the app stays up.

`GET /api/v1/health` always returns `"status":"ok"`. Inspect `jobs.mode`
(`inline` | `queue`) and `jobs.redis` (`disabled` | `ok` | `error`).

## Local (optional queue)

```bash
cd backend
docker compose --profile jobs up -d redis
# in .env:
JOBS_USE_REDIS=true
REDIS_URL=redis://localhost:6379

uvicorn app.main:app --reload --port 8000
# optional dedicated worker:
arq app.jobs.worker.WorkerSettings
```

## Production recommendation (Render free)

Leave **`JOBS_USE_REDIS` unset/false** and **do not set `REDIS_URL`**.
Inline jobs are enough for pilot traffic and avoid Upstash free-tier limits.

## Smoke

```bash
export SMOKE_API_BASE=https://YOUR-HOST/api/v1
export SMOKE_EMAIL=…
export SMOKE_PASSWORD=…
python backend/scripts/pilot_smoke.py
```
