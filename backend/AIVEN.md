# Deploy SurvAI API on Aiven Runtime

Aiven Runtime builds your `Dockerfile`, runs the container next to managed
data services, and (when using Compose) can provision **Aiven for PostgreSQL**
from a `postgres` image entry.

Docs: [Deploy an application](https://aiven.io/docs/products/runtime/deploy-apps) ·
[Compose files](https://aiven.io/docs/products/runtime/manifest-files/compose-files)

## What we ship for Aiven

| File | Role |
| --- | --- |
| [`compose.aiven.yaml`](compose.aiven.yaml) | Runtime manifest: `api` + `postgres-db` |
| [`Dockerfile`](Dockerfile) | Builds the API; `EXPOSE 8000`; starts via `scripts/start.sh` |
| [`scripts/start.sh`](scripts/start.sh) | `alembic upgrade head` then uvicorn on `$PORT` (default 8000) |

`DATABASE_URL` from Aiven (`postgres://` / `postgresql://`) is auto-normalized
to `postgresql+asyncpg://` in [`app/core/config.py`](app/core/config.py).

## Deploy (Console)

1. Push latest `backend/` to GitHub (`main` or your deploy branch).
2. [Aiven Console](https://console.aiven.io) → your **project** → **Runtime**.
3. **Deploy application** → connect GitHub → select repo `survai` + branch.
4. Choose manifest **`backend/compose.aiven.yaml`** → **Scan**.
5. Confirm:
   - Application port **8000** / HTTP
   - PostgreSQL service will be created from `postgres-db`
   - Cloud + region (same region as other Aiven services if you have them)
6. **Deploy**.
7. After it’s up, open the app → **Environment** and set real values:
   - `CORS_ORIGINS` / `FRONTEND_URL` → your Vercel URL (no trailing slash)
   - `JWT_SECRET_KEY` → `openssl rand -hex 32`
   - `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAILS_FROM_*`
   - `FIRST_SUPERUSER_*` (strong password)
   - Keep `DATABASE_SSL=true`, `COOKIE_SECURE=true`, `COOKIE_SAMESITE=none`
8. Copy the public app URL (e.g. `https://….aiven.app` or the hostname Aiven shows).
9. Smoke test: `GET {url}/api/v1/health` and `{url}/docs`.

> Pushing to GitHub does **not** auto-redeploy. Redeploy from the Console when you want a new commit live.

## Existing Aiven Postgres (no new DB)

If you already have Aiven for PostgreSQL and only want the API:

1. Deploy using the **Dockerfile** as the manifest (or a Compose file with only `api` and no `postgres` image).
2. Create an integration / set `DATABASE_URL` to the service connection URI.
3. Set `DATABASE_SSL=true`.

See [service credential integration](https://aiven.io/docs/products/runtime/deploy-apps) (`application_service_credential` → `DATABASE_URL`).

## Frontend (Vercel)

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-AIVEN-APP-HOST/api/v1
```

Redeploy Vercel after changing env vars. Cross-site cookies need
`COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` (already in the compose defaults).

## Local check before deploy

```bash
cd backend
docker build -t survai-api .
docker run --rm -p 8000:8000 \
  -e DATABASE_URL=postgresql+asyncpg://… \
  -e DATABASE_SSL=true \
  -e JWT_SECRET_KEY=dev \
  survai-api
```
