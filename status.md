# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: October 2026 (FastAPI auth scaffold + Aiven Postgres).

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router UI — survey modules largely mock data |
| Backend | `backend/` | FastAPI auth + orgs live against Aiven Postgres |
| Docs | `plan.md`, `PRODUCT.md`, this file | Plan updated for `backend/` layout |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). Does everything in MVP. |
| **User (DB)** | Login credentials for that org (1:1 for now). Not multi-seat staff yet. |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

- **Sidebar nav:** `frontend/src/config/nav-config.ts` → `AppSidebar`; icons via `src/components/icons.tsx`.
- **Auth security:** JWT + httpOnly cookies issued by FastAPI (`plan.md` §7). Better Auth = FE UX only (not wired as security backend yet).
- **FE env:** `frontend/.env` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings.
- Clean architecture: **routes → services → repositories → models**, DI, type hints.
- **Auth (org account):** register creates **Organization + login User (1:1)**; login / refresh / logout / me / forgot/reset password. No staff invites yet.
- JWT access + opaque refresh tokens (hashed in DB); bcrypt passwords; CORS for `localhost:3000`.
- Tables on Aiven: `organizations`, `users`, `refresh_tokens`, `password_reset_tokens`, `alembic_version`.
- Docker Compose (dev + Traefik prod), Pytest (auth/health), GH Actions `backend-ci` / `backend-cd`.
- Default superuser seed: `admin@example.com` under org **SurvAI** (see `backend/.env`).

**Run API locally:**
```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
# Docs: http://127.0.0.1:8000/docs
```

---

## 3. Backend — not done yet

- Full §6 domain schema (plans, surveys, sections, questions, versions, respondents, analytics, reports).
- Plans / surveys / review / collect / analytics / reports APIs.
- AI orchestration (§8), reconciliation (§9), Pandas analytics (§10), ARQ jobs (§14).
- OpenAPI-typed FE client regeneration.

---

## 4. Frontend — done (UI)

- RHF + Zod forms stack; field components under `components/forms/fields`.
- Dashboard shell, surveys list/hub, Build / Review / Collect / Analytics / Reports scaffolding.
- Respondents list + detail views (mock data).
- Auth pages (login / register / forgot) with RHF+Zod; `auth-context` can call live `/api/v1/auth/*`.

---

## 5. Frontend — still mock / gaps

- Overview + survey module interiors: hardcoded / mock services.
- Auth still seeds a **mock user** when no token, and stores access token in **`sessionStorage`** (plan forbids durable token storage — fix when finishing FE↔API auth).
- Better Auth UX not integrated on top of JWT cookies yet.
- Survey/plan/analytics/report features not on TanStack Query against real APIs.

---

## 6. Known next (priority)

1. **P0** — Alembic migrations for §6 domain tables + Plans/Surveys CRUD.
2. **P0** — Finish FE auth against live API (drop mock + sessionStorage; cookie credentials).
3. **P0** — Wire survey features via TanStack Query service layer.
4. **P0** — Public collection route against real API.
5. **P1+** — AI layer, analytics engine, reports/export, ARQ.

---

## 7. Files that matter

**Backend:** `backend/app/main.py`, `api/v1/routes/auth.py`, `services/auth.py`, `models/`, `alembic/versions/0001_initial_auth.py`, `README.md`

**Frontend:** `frontend/src/lib/auth-context.tsx`, `frontend/.env`, `config/nav-config.ts`, `components/icons.tsx`, survey/respondent feature folders under `src/features/` and `src/app/dashboard/`

---

## 8. Out of this snapshot

- Per-PRD feature acceptance (PLN/BLD/REV/…) — still UI/mock until domain APIs exist.
- Password rotation on Aiven if credentials were ever shared outside the machine.
