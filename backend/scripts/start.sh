#!/bin/sh
# Container entrypoint (Render / Docker): migrate, optional ARQ worker, then serve.
# Redis is NOT required. Jobs run inline unless JOBS_USE_REDIS=true and REDIS_URL is set.
set -eu

PORT="${PORT:-8000}"

echo "Running alembic upgrade head…"
alembic upgrade head

# Opt-in only — free-tier / exhausted Upstash must not block the API.
JOBS_FLAG="$(echo "${JOBS_USE_REDIS:-false}" | tr '[:upper:]' '[:lower:]')"
if [ "$JOBS_FLAG" = "true" ] || [ "$JOBS_FLAG" = "1" ] || [ "$JOBS_FLAG" = "yes" ]; then
  if [ -n "${REDIS_URL:-}" ]; then
    echo "JOBS_USE_REDIS=true — starting ARQ worker in background…"
    arq app.jobs.worker.WorkerSettings &
  else
    echo "JOBS_USE_REDIS=true but REDIS_URL empty — jobs run inline"
  fi
else
  echo "JOBS_USE_REDIS off — jobs run inline on the API process (Redis not required)"
fi

echo "Starting uvicorn on 0.0.0.0:${PORT}"
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
