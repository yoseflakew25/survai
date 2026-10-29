# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: **29 October 2026** — Plan → Reports live; org overview KPIs/chart
> from real data; report create can queue via Redis/ARQ; Render + Vercel deploy;
> auth/delete hardening; pilot smoke scripts.

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router — Plan→Reports + live overview dashboard |
| Backend | `backend/` | FastAPI auth + orgs + plans/surveys/review/collect/respondents/analytics/reports/overview; Aiven Postgres; Render Docker |
| Docs | `plan.md`, `PRODUCT.md`, this file | `plan.md` §23/§25 track current milestone status |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). Does everything in MVP. |
| **User (DB)** | Login credentials for that org (1:1 for now). Not multi-seat staff yet. |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### MVP roles (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*` |
| `organization` | Default for all signups and non-platform accounts |

- **Sidebar nav:** `frontend/src/config/nav-config.ts` → `AppSidebar`; icons via `src/components/icons.tsx`.
- **Auth security:** JWT + httpOnly cookies issued by FastAPI (`plan.md` §7). No Google sign-in.
- **FE env:** `frontend/.env` → `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).
- **Prod:** Vercel FE (`survai-snowy.vercel.app`) → Render API (`…/api/v1`); keep-alive via UptimeRobot on `/api/v1/health` (GET+HEAD).
- **Pill nav:** Plan → Review → Collect → Respondents → Analytics → Report + **All surveys**.
- **Survey hub:** removed — `/dashboard/surveys/[id]` redirects to `/plan`.
- **Activity modal:** shared `SurveyActivityProvider` + instrument-style modal for long AI actions across survey tabs.

### Integrity guarantees (live)

- 1 plan ↔ 1 survey (`uq_surveys_plan_id`); plan locks after questions exist.
- Publish once; questions locked when published/closed/archived; no status unlock via PATCH.
- Published/closed/archived surveys **cannot be hard-deleted**.
- Collect / Respondents / Analytics all use `survey.current_version_id` (stable `/s/{survey_id}`).
- Answer `question_id` has no FK to live draft questions (migration `0012`).
- Reports store a frozen `metrics_snapshot`; narrative numbers must reconcile (§9).
- Report UI surfaces `integrity.is_stale` when live responses diverge from the snapshot.

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings; routes → services → repositories.
- **Auth:** register → email OTP → verify; login/refresh/logout/me; forgot/reset password; JWT + cookies.
  - Already-verified `verify-email` **does not** mint tokens (must log in).
  - `DELETE /users/me` removes the org only when no other members remain.
- **Email:** Gmail SMTP and/or Resend; `dev_code` when outbound mail unconfigured.
- **Plans + Gemini planner:** CRUD / approve / generate (`planner_v1`).
- **Surveys + Builder AI:** from-plan, generate, section regenerate, section/question CRUD (`builder_v1`); list includes `responses_count`.
- **Reviewer AI:** `POST /surveys/{id}/review`, latest, finding status (`reviewer_v1`). Prefer **`gemini-3.1-flash-lite`** for structured JSON — `gemini-3.8-flash` hangs.
- **Collection:** publish / close / collect-stats; public GET + one-shot submit; identity section.
- **Respondents:** list + detail scoped to current version.
- **Analytics:** summary / query / crosstab via `app/analytics/engine.py` (deterministic); CSV export; saved analyses CRUD.
- **Reports:** tables + `report_v1` / compact `chat_v1` + §9 reconciliation; generate / patch / section regen / chat; **PDF via fpdf2**; **DOCX via OOXML**.
- **Overview:** `GET /api/v1/overview` — org KPIs + 12‑month started/completed activity.
- **Jobs / ARQ:** `REDIS_URL` set → report create returns **202 + job_id**; FE polls `GET /jobs/{id}`; `scripts/start.sh` runs worker beside uvicorn. Empty `REDIS_URL` → inline (201).
- **Health:** `GET` + `HEAD` `/api/v1/health` (UptimeRobot-compatible).
- **RBAC:** `system_admin` \| `organization`; startup `ensure_first_superuser()`.
- **Alembic:** through **`0013_reports`** (Aiven / Render).
- Pytest: auth, plans, surveys, collection, reviewer, analytics, integrity, reports, overview, jobs (inline).
- Docker Compose (`--profile jobs` for Redis/worker), GH Actions `backend-ci` / `backend-cd` / keep-render-warm.
- **Pilot smoke:** `backend/scripts/pilot_smoke.py` (`SMOKE_*` env).

**Run API locally:**
```bash
cd backend && source .venv/bin/activate
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

---

## 3. Backend — not done yet

- Confirm prod `REDIS_URL` (Upstash) on every Render deploy; export path still sync by default.
- Multi-seat org roles; OpenAPI-typed FE client regeneration.
- Optional: WeasyPrint/docxtpl branded templates if donor layout needs rise above current PDF/DOCX.
- Remaining hardening from audit: CSRF with `SameSite=None` (bootstrap password no longer reset on boot; prod rejects weak JWT / bootstrap password).

---

## 4. Frontend — done (live API)

- Cookie auth: sign-in, sign-up + OTP, forgot/reset; Google OAuth remnants removed.
- Plans editor + generate/approve; create survey from plan → Review.
- Reviewer UI (AI review, findings, quality score); locked when published.
- Collect (publish, QR, link); CTA → Respondents.
- Respondents table + detail sheet; brand CTA → Analytics.
- Analytics dashboard (summary, distributions, crosstabs, CSV export).
- **Reports** generate / edit / grounded chat / Save as PDF + Word; stale-snapshot banner; **202 job poll** when API queues.
- **Overview dashboard:** live KPIs + response-activity chart (`GET /overview`); recent surveys with real response counts.
- Shared survey activity modal (page loads + long AI actions).
- BLD-04 pending conditional-logic confirm banner in question editor.
- Pill nav + All surveys; survey detail redirects to Plan.
- Forms: RHF + Zod; TanStack Query for feature data.
- API client timeout **90s** + cold-start copy (Render free wake).
- Playwright smoke (`frontend/e2e/smoke.spec.ts`) — login/nav/(optional survey path); needs `PLAYWRIGHT_*` / `E2E_*`.

---

## 5. Frontend — still soft / gaps

- Better Auth UX layer not required for security (JWT cookies are the model).
- Full Playwright path (publish → submit → analytics → report) needs staging credentials + `E2E_SURVEY_ID`.
- Unused template parallel routes (`@pie_stats`, `@bar_stats`) still scaffolded; overview uses KPIs + `@area_stats` + `@surveys`.

---

## 6. Known next (priority)

1. Set/verify Render `REDIS_URL` (Upstash) and redeploy so report generate uses the queue in prod.
2. Run pilot smoke against live (`SMOKE_*` / Playwright with `E2E_*`).
3. Multi-seat org roles when needed.
4. Optional CSRF hardening when cookies use `SameSite=None` (bootstrap/secrets audit items done).

---

## 7. Files that matter

**Backend:** `app/main.py`, `api/v1/routes/{auth,overview,plans,surveys,public_collection,reviewer_findings,reports,jobs}.py`, `services/{auth,overview,plan,survey,collection,respondents,analytics,reviewer,report,report_pdf,report_docx,email}.py`, `analytics/engine.py`, `ai/{client,schemas,reconciliation,prompts/*,services/*}`, `jobs/*`, `models/*`, `alembic/versions/0001`–`0013`, `scripts/{start.sh,pilot_smoke.py}`, `docs/redis-arq.md`, `tests/test_{integrity_chain,report_*,overview,jobs}.py`

**Frontend:** `lib/auth-context.tsx`, `lib/api.ts`, `features/{overview,plans,builder,reviewer,collect,collection,respondents,analytics,reports,surveys}/**`, `components/survai-panel.tsx`, `features/surveys/components/survey-pill-nav.tsx`, `features/surveys/components/survey-activity-*.tsx`, `app/dashboard/overview/**`, `e2e/smoke.spec.ts`

---

## 8. Out of this snapshot

- Do not commit secrets (`GEMINI_API_KEY`, `FIRST_SUPERUSER_PASSWORD`, SMTP/Resend, `REDIS_URL`) into git.
