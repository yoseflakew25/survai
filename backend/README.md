# SurvAI API (FastAPI)

Python backend for SurvAI — clean architecture, JWT + httpOnly cookies, PostgreSQL.

Designed to pair with the Next.js app in `../frontend` (`CORS_ORIGINS=http://localhost:3000`, API prefix `/api/v1`).

## Stack

| Piece | Choice |
| --- | --- |
| API | FastAPI |
| ORM | SQLAlchemy 2 (async) + Alembic |
| Validation / settings | Pydantic v2 + pydantic-settings |
| DB | PostgreSQL 16 |
| Auth | JWT access + opaque refresh tokens (hashed in DB), bcrypt passwords |
| Password recovery | Email link (SMTP or console log in dev) |
| Proxy | Traefik (optional local profile + production HTTPS) |
| Tests | Pytest + httpx + pytest-asyncio |
| CI/CD | GitHub Actions |

## Architecture

```
routes  →  services  →  repositories  →  models
  ↑            ↑
schemas     deps (DI)
```

```
app/
├── api/v1/routes/     # HTTP handlers
├── services/          # business use-cases
├── repositories/      # data access
├── models/            # SQLAlchemy ORM
├── schemas/           # Pydantic request/response
├── core/              # config, security, exceptions
└── db/                # engine, session, Base
```

## Quick start (Docker Compose)

```bash
cd backend
cp .env.example .env
docker compose up --build
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- Health: http://localhost:8000/api/v1/health  
- Postgres: `localhost:5432` (user/pass/db: `survai`)

Optional Traefik (http://api.localhost):

```bash
docker compose --profile proxy up --build
```

Optional Mailpit for password-reset emails:

```bash
# set SMTP_ENABLED=true and SMTP_HOST=mailpit in .env, then:
docker compose --profile mail up --build
# UI: http://localhost:8025
```

Default superuser (created on startup if missing): see `FIRST_SUPERUSER_*` in `.env`.

## Local Python (without Docker for the API)

Requires **Python 3.12** (see `.python-version`). With [uv](https://docs.astral.sh/uv/):

```bash
cd backend
uv python install 3.12
uv venv --python 3.12 .venv && source .venv/bin/activate
uv pip install -r requirements.txt
cp .env.example .env
docker compose up -d db
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

## Auth API (frontend contract)

| Method | Path | Notes |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | Sets cookies + returns token pair + user |
| POST | `/api/v1/auth/login` | Same |
| POST | `/api/v1/auth/refresh` | Cookie or `{ refresh_token }` body; rotates |
| POST | `/api/v1/auth/logout` | Revokes refresh (cookie or body); clears cookies |
| GET | `/api/v1/auth/me` | Bearer **or** `access_token` cookie |
| POST | `/api/v1/auth/forgot-password` | Always 200 (no email enumeration) |
| POST | `/api/v1/auth/reset-password` | `{ token, new_password }` |

Cookies: `access_token`, `refresh_token` (httpOnly).  
CORS: credentials enabled for `CORS_ORIGINS` (default `http://localhost:3000`).

Frontend should call with `credentials: 'include'` when using cookies.

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest -q
```

## Production deploy (Docker Compose + Traefik HTTPS)

1. Point DNS `A/AAAA` for `api.example.com` at your VPS.
2. Copy `.env.production.example` → `.env.production` and fill secrets.
3. Set `API_DOMAIN`, `ACME_EMAIL`, strong `JWT_SECRET_KEY` / DB password.
4. On the server:

```bash
cd backend
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Traefik obtains Let's Encrypt certificates via HTTP-01 and terminates TLS for the API.

### Frontend Traefik proxy (HTTPS)

Run your Next.js app as another Docker service on the same Traefik `edge` network and label it:

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.docker.network=survai_edge"
  - "traefik.http.routers.survai-web.rule=Host(`${APP_DOMAIN}`)"
  - "traefik.http.routers.survai-web.entrypoints=websecure"
  - "traefik.http.routers.survai-web.tls.certresolver=letsencrypt"
  - "traefik.http.services.survai-web.loadbalancer.server.port=3000"
```

Set frontend `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/api/v1` and API `CORS_ORIGINS=https://app.example.com`.

## CI / CD

- **CI** (`.github/workflows/backend-ci.yml`): ruff + pytest + Docker build on `backend/**` changes.
- **CD** (`.github/workflows/backend-cd.yml`): on push to `main`, build/push image to GHCR (`ghcr.io/<org>/survai/api`). Optional SSH deploy step is commented — uncomment and add secrets when ready.

## Extending for SurvAI domain

Add feature slices the same way:

1. `models/` + Alembic revision  
2. `schemas/`  
3. `repositories/`  
4. `services/`  
5. `api/v1/routes/` + include in `api/v1/router.py`

Keep numbers/analytics deterministic on the server (see repo `plan.md` §9–§10); do not put statistical computation in the LLM layer.
