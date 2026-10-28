# Deploy SurvAI API on Railway

Frontend (Vercel) and API (Railway) are separate. Cookies must be cross-site
(`SameSite=None; Secure`) so the browser sends them from `*.vercel.app` to
`*.up.railway.app`.

## 1. Create the service

1. [Railway](https://railway.app) → New Project → **Deploy from GitHub** → `survai`
2. Set **Root Directory** to `backend`
3. Add plugin: **PostgreSQL** (or reuse Aiven / Neon and skip the plugin)
4. Railway will build `backend/Dockerfile` and run `scripts/start.sh`
   (Alembic migrate → uvicorn on `$PORT`)

## 2. Environment variables

Set these on the **API** service (Variables tab). Do **not** commit secrets.

| Variable | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DEBUG` | `false` |
| `DATABASE_URL` | From Railway Postgres → **Connect** → copy URL (auto-normalized to `postgresql+asyncpg://`). If using Aiven/Neon, paste that URL. |
| `DATABASE_SSL` | `true` (required for Railway Postgres / managed DBs) |
| `JWT_SECRET_KEY` | `openssl rand -hex 32` |
| `CORS_ORIGINS` | Your Vercel origin(s), comma-separated — e.g. `https://survai.vercel.app` (no trailing slash) |
| `FRONTEND_URL` | Same primary Vercel URL |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAMESITE` | `none` |
| `COOKIE_DOMAIN` | leave **empty** (different domains: Vercel vs Railway) |
| `GEMINI_API_KEY` | your key |
| `RESEND_API_KEY` | optional but recommended for OTP email |
| `EMAILS_FROM_EMAIL` | verified sender |
| `EMAILS_FROM_NAME` | `SurvAI` |
| `FIRST_SUPERUSER_EMAIL` | your admin email |
| `FIRST_SUPERUSER_PASSWORD` | strong password |
| `FIRST_SUPERUSER_FULL_NAME` | `SurvAI Admin` |
| `FIRST_SUPERUSER_ORGANIZATION_NAME` | `SurvAI` |

Optional model overrides: `GEMINI_MODEL_*` (defaults are already set in code).

If Railway wired Postgres as a reference variable, you can use:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
```

## 3. Public URL

1. Service → **Settings** → **Networking** → **Generate Domain**
2. Note the URL, e.g. `https://survai-api-production.up.railway.app`
3. Health check: `GET /api/v1/health` → `{"status":"ok"}` (or similar)
4. Docs: `/docs`

## 4. Point the frontend at the API

On Vercel (next step after this backend is up):

```text
NEXT_PUBLIC_API_BASE_URL=https://YOUR-RAILWAY-HOST/api/v1
```

Redeploy the frontend after changing env vars.

## 5. CLI (optional)

```bash
# from repo root
source "$HOME/.railway/env"
cd backend
railway login
railway link          # pick project + service
railway variables     # inspect
railway up            # one-off deploy from local
railway logs
```

## Cookie / CORS checklist

- Vercel origin must appear exactly in `CORS_ORIGINS` (scheme + host, no path).
- `COOKIE_SAMESITE=none` + `COOKIE_SECURE=true` when FE and API hosts differ.
- API calls from the browser must use `credentials: 'include'` (already true in SurvAI `apiFetch`).
