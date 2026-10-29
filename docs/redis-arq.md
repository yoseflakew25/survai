# Redis + ARQ (free-tier)

Long report generation can return **202 Accepted** + `job_id` when `REDIS_URL` is set. The frontend polls `GET /api/v1/jobs/{job_id}` until the worker finishes.

## Local

```bash
cd backend
docker compose --profile jobs up -d redis
# in .env:
REDIS_URL=redis://localhost:6379

# terminal A — API (inline worker also starts if you use scripts/start.sh)
uvicorn app.main:app --reload --port 8000

# terminal B — dedicated worker (optional when using compose `worker` service)
arq app.jobs.worker.WorkerSettings
```

Or: `docker compose --profile jobs up --build`

## Production (Render free + Upstash free)

1. Create a free Redis DB at [Upstash](https://upstash.com) (region near Render).
2. Copy the **Redis URL** (`rediss://…`).
3. In the Render web service → Environment → add:
   - `REDIS_URL` = that URL
4. Redeploy. `scripts/start.sh` starts the ARQ worker in the **same** container as uvicorn (no second paid service).

Without `REDIS_URL`, report create stays synchronous (201) — same as before.

## Smoke

```bash
export SMOKE_API_BASE=https://survai-mzam.onrender.com/api/v1
export SMOKE_EMAIL=…
export SMOKE_PASSWORD=…
python backend/scripts/pilot_smoke.py
```
