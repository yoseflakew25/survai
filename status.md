# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: 18 October 2026 (milestone 1: live survey plans + Gemini planner).

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router — survey modules still largely mock data; auth + roles typed to live API |
| Backend | `backend/` | FastAPI auth + orgs + RBAC + email OTP/reset + **survey plans + Gemini planner** on Aiven Postgres |
| Docs | `plan.md`, `PRODUCT.md`, this file | Plan §6/§7/§17/§23 track `system_admin` / `organization` + mail flows |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). Does everything in MVP. |
| **User (DB)** | Login credentials for that org (1:1 for now). Not multi-seat staff yet. |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### MVP roles (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*`; gates `/users` admin APIs |
| `organization` | Default for all signups and non-platform accounts |

- **Sidebar nav:** `frontend/src/config/nav-config.ts` → `AppSidebar`; icons via `src/components/icons.tsx`.
- **Auth security:** JWT + httpOnly cookies issued by FastAPI (`plan.md` §7). Better Auth = FE UX only (not wired as security backend yet).
- **FE env:** `frontend/.env` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings.
- Clean architecture: **routes → services → repositories → models**, DI, type hints.
- **Auth (org account):** register creates **Organization + login User (1:1)** with `role=organization` and `email_verified=false`; emails a 6-digit OTP; `POST /auth/verify-email` issues tokens; `POST /auth/resend-verification`; login blocked until verified. Also login / refresh / logout / me.
- **Password recovery:** `POST /auth/forgot-password` + `POST /auth/reset-password` (hashed tokens, invalidate prior unused, revoke refresh on reset).
- **Email delivery:** Gmail SMTP and/or Resend (`app/services/email.py`); branded HTML + SurvAI mark CID; `dev_code` only when outbound mail is unconfigured.
- **Survey plans (milestone 1):** `survey_plans` + `ai_generation_logs`; CRUD / approve; `POST /plans/generate` + `POST /plans/{id}/generate` via Gemini (`app/ai/`).
- **RBAC:** `UserRole.system_admin` \| `UserRole.organization`; `AdminUser` = `require_roles(system_admin)`; startup `ensure_first_superuser()` syncs platform admin + demotes everyone else to `organization`.
- JWT access + opaque refresh tokens (hashed in DB); bcrypt passwords; CORS for `localhost:3000`.
- Org profile fields: name, description, website.
- **Alembic on Aiven:** through **`0007_survey_plans`**.
- Docker Compose (dev + Traefik prod), Pytest (auth + plans + health), GH Actions `backend-ci` / `backend-cd`.
- **Platform system admin (dev):** `yoseflakewdev@gmail.com` / see `backend/.env` `FIRST_SUPERUSER_*` (password synced on API startup).
- **AI:** `GEMINI_API_KEY` + `GEMINI_MODEL_*` (default `gemini-3.8-flash`).

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
- Multi-seat org roles (PRD researcher/viewer) — deferred; do not reintroduce until seats exist.
- OpenAPI-typed FE client regeneration.

---

## 4. Frontend — done (UI)

- RHF + Zod forms stack; field components under `components/forms/fields`.
- Dashboard shell, surveys list/hub; **plan-first** flow (New Survey → plan page).
- Shared **pill nav:** Plan → Review → Collect → Analytics → Report.
- Plan editor restyle (SurvaiPanels, stepper, Back to Surveys, status badges).
- Review / Collect / Analytics / Report polish (Back to Surveys on review; report chat restyle).
- Respondents list + detail views (mock data).
- **Auth pages (live API):** sign-in, sign-up → OTP (`InputOTP`), forgot-password, reset-password; sign-in links to forgot; `auth-context` exposes `register` / `verifyEmail` / `resendVerification` / `requestPasswordReset` / `confirmPasswordReset`.
- **Plans FE:** `features/plans/api/service.ts` calls live `/plans` + Gemini generate (New Survey / plan editor).
- FE role types: `'system_admin' | 'organization'` (`lib/api.ts`, `auth-context`); org switcher labels.

---

## 5. Frontend — still mock / gaps

- Overview + survey module interiors: hardcoded / mock services (no real Plans/Surveys API yet).
- Auth still seeds a **mock user** when no token, and stores access token in **`sessionStorage`** (plan forbids durable token storage — fix when finishing FE↔API auth).
- Better Auth UX not integrated on top of JWT cookies yet.
- Nav is not role-filtered yet (`use-nav.ts` pass-through); fine while org accounts own the whole workspace.
- Survey/plan/analytics/report features not on TanStack Query against real APIs.

---

## 6. Known next (priority)

1. **P0** — Finish FE auth against live API (drop mock + sessionStorage; cookie credentials).
2. **P0** — Publish + public collection / survey_versions (Phase 5).
3. **P1** — Reviewer AI; analytics engine; report AI (Phases 6–7).
4. **P1** — Role-aware FE nav/guards if system_admin gets a distinct console.
5. **P1+** — ARQ / exports / OpenAPI-typed client; BLD-04 pending conditional logic UI.

---

## 7. Files that matter

**Backend:** `backend/app/main.py`, `api/v1/routes/{auth,plans,surveys}.py`, `services/{auth,plan,survey,email}.py`, `ai/{client,schemas,prompts/{planner_v1,builder_v1},services/{planner,builder}}.py`, `models/{user,survey_plan,survey,ai_generation_log}.py`, `alembic/versions/0008_surveys_sections_questions.py`, `README.md`

**Frontend:** `frontend/src/lib/auth-context.tsx`, `frontend/src/lib/api.ts`, `features/plans/api/service.ts`, `features/builder/api/service.ts`, `features/auth/components/*`, `features/plans/components/plan-editor.tsx`, `features/surveys/components/new-survey-dialog.tsx`

---

## 8. Out of this snapshot

- Per-PRD feature acceptance for collect/reviewer/analytics/report — still mock until Phases 5–7.
- Password rotation on Aiven if credentials were ever shared outside the machine.
- Do not commit real `FIRST_SUPERUSER_PASSWORD` / `SMTP_PASSWORD` / `RESEND_API_KEY` into git; keep them in `backend/.env` only.
