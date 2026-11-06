# Redis + ARQ (free-tier)

Long **report generation** and **report export** return **202 Accepted** +
`job_id` when `REDIS_URL` is set and enqueue succeeds. The frontend polls
`GET /api/v1/jobs/{job_id}` until the worker finishes.

Without `REDIS_URL` (or if enqueue fails), both stay **inline** (201) — same
behavior as before. Check `GET /api/v1/health` → `jobs.redis`
(`ok` | `disabled` | `error`).

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
2. Copy the **Redis URL** — must be `rediss://…` (TLS), not a redis-cli snippet.
3. In the Render web service → Environment → add:
   - `REDIS_URL` = that URL
4. Redeploy. `scripts/start.sh` starts the ARQ worker in the **same** container
   as uvicorn (no second paid service). Confirm logs show
   `REDIS_URL set — starting ARQ worker`.
5. Smoke: `GET /api/v1/health` should show `"jobs":{"enabled":true,"redis":"ok"}`.

### Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| Reports always 201 | `REDIS_URL` unset or enqueue failed (see API logs) |
| Jobs stay `queued` | Worker not running — use `start.sh` or a dedicated `arq` process |
| `jobs.redis=error` | Bad DSN, TLS (`rediss://`), or Upstash network block |
| Export 202 but FE hangs | Old frontend — export polling ships with pilot polish |

## Smoke

```bash
export SMOKE_API_BASE=https://YOUR-HOST/api/v1
export SMOKE_EMAIL=…
export SMOKE_PASSWORD=…
python backend/scripts/pilot_smoke.py
# full path (publish → submit → report → assistant):
python backend/scripts/pilot_full_path.py
```
