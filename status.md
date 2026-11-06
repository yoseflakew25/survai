# Codebase Progress — SurvAI / AI Survey Copilot

> Living snapshot of what is implemented vs mock vs next.
> Last updated: **6 November 2026** — Plan → Reports live; Org Assistant;
> **multi-seat orgs** (Owner / Researcher / Viewer); collection quota + share
> pack; donor ZIP export; baseline/endline compare; **skip/branch logic
> (BLD-08)**; **saved analysis views**; report **`?reportId=`** deep-links.

Architectural source of truth: `plan.md`. Stack gates: `plan.md` §2a.

---

## 1. Project Shape

| Layer | Path | Status |
| --- | --- | --- |
| Frontend | `frontend/` | Next.js App Router — Plan→Reports + Overview + **Assistant** |
| Backend | `backend/` | FastAPI through Reports/Overview/Notifications/**Assistant**; Aiven Postgres; Railway/Render Docker |
| Docs | `plan.md`, `PRODUCT.md`, this file | `plan.md` §23/§25 track milestones |

### Domain language (do not confuse)

| Term | Meaning |
| --- | --- |
| **Organization** | The account/workspace that owns surveys (e.g. DICDO). |
| **User (DB)** | Seat in an org — Owner, Researcher, or Viewer (email invite). |
| **Respondent** | Person who *fills* a published survey. **No account** — public link only. |

### Org seats (live)

| Role | Meaning |
| --- | --- |
| `system_admin` | SurvAI platform operator — seeded from `FIRST_SUPERUSER_*` |
| `organization` | **Owner** — signup creates org; invite/revoke seats; full mutate |
| `researcher` | Edit/publish/build/report; no seat management |
| `viewer` | Read analytics/reports/assistant; no mutate CTAs |

- **Sidebar nav:** Dashboard, Surveys, **Assistant**, Account (`nav-config.ts`).
- **Auth:** JWT + httpOnly cookies; email/password + OTP; **Google Identity (GIS)** → same cookies.
- **FE env:** `NEXT_PUBLIC_API_BASE_URL` → API `/api/v1` (use `localhost`, not `127.0.0.1`, for cookies).
- **Prod path:** Vercel FE → Railway/Render API; health `GET`/`HEAD` `/api/v1/health`.
- **Pill nav (survey):** Plan → Review → Collect → Respondents → Analytics → Report + All surveys.
- **Theme:** Launchpot-derived light world (warm paper + lime brand); see `DESIGN.md` / `PRODUCT.md`.

### Integrity guarantees (live)

- 1 plan ↔ 1 survey; plan locks after questions exist; publish-once; question lock.
- Published/closed/archived surveys cannot be hard-deleted.
- Collect / Respondents / Analytics use `survey.current_version_id`.
- Reports store frozen `metrics_snapshot`; narrative numbers must reconcile (§9).
- **Org Assistant:** numbers from analytics tools / snapshots only — RAG chunks are narrative context, not a calc engine.

---

## 2. Backend — done

- FastAPI + SQLAlchemy 2 async + Alembic + Pydantic settings; routes → services → repositories.
- **Auth:** register → OTP → verify; login/refresh/logout/me; forgot/reset; **Google OAuth**; JWT + cookies.
- **Email:** SMTP and/or Resend; `dev_code` when outbound mail unconfigured.
- **Plans / Builder / Reviewer / Collection / Respondents / Analytics / Reports / Overview** — live (see prior milestones).
- **Notifications:** in-app feed + unread; emitters on publish / response milestones / report ready / review complete.
- **Org Assistant (RAG + tools):** Alembic **`0016_org_assistant`**
  - Tables: `assistant_threads`, `assistant_messages`, `org_knowledge_chunks`
  - Index: survey / report / review → chunks with **local HF embeddings** (`fastembed`, `BAAI/bge-small-en-v1.5`)
  - Chat: retrieve top-k → Gemini plan → structured tools → grounded answer + citations
  - API: `/assistant/threads`, messages, **`POST …/messages/stream` (SSE)**, `POST /knowledge/reindex`
  - Docker: model pre-baked into image (`EMBEDDING_CACHE_DIR`)
- **Jobs / ARQ:** **inline by default** (`JOBS_USE_REDIS=false`). Redis is opt-in only; exhausted/missing Redis never blocks the API.
- **Org seats:** Alembic **`0017_org_seats`** — `org_invites`; roles researcher/viewer; `POST /auth/accept-invite`; `/org/team` + invites (owner-only mutate).
- **Collection settings:** Alembic **`0018_collection_compare`** — `response_quota`, `closes_at` enforced on public submit + collect-stats.
- **Donor pack:** `POST /reports/{id}/export-pack` → ZIP (PDF + DOCX + analytics CSV).
- **Compare:** `instrument_family_id` / `wave_label`; `POST …/duplicate-as-endline`; `GET …/compare?other_id=`.
- **Skip / branch (BLD-08):** shared `conditional_logic` evaluator (snake + camel);
  public submit + complete skip inactive required questions; builder confirm/clear.
- **Saved analyses:** `GET`/`POST /surveys/{id}/saved-analyses`; report create accepts
  `saved_analysis_id` and freezes filtered metrics in `metrics_snapshot`.
- **Report deep-link:** `GET /reports/{id}`; `notify_report_ready` href includes
  `?reportId=`.
- **Alembic:** through **`0018_collection_compare`**.
- Pytest: `test_dicdo_features` + `test_branching_and_reports` (skip-on-submit,
  saved-view filters, GET by id, Owner→Researcher dogfood) + assistant suites.

**Run API locally:**
```bash
cd backend && source .venv/bin/activate
uv pip install -r requirements.txt   # includes fastembed
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

**Deploy:** `backend/Dockerfile` + `scripts/start.sh` (migrate → uvicorn). See `backend/RAILWAY.md`.

---

## 3. Backend — soft / next

- Confirm prod `REDIS_URL` where async report jobs are desired.
- Run `POST /assistant/knowledge/reindex` once per org after first Assistant deploy (or after embedding model change).
- Run `alembic upgrade head` on Aiven/Render for **0017 + 0018**.
- Optional: multi-org switcher / custom role matrices / SSO; pgvector; CSRF with `SameSite=None`.

---

## 4. Frontend — done (live API)

- Auth UI (email/OTP + Google); Plans → Builder → Review → Collect → Respondents → Analytics → Reports.
- Overview KPIs + activity; survey activity modal; pill nav.
- **Assistant** (`/dashboard/assistant`): thread list + chat, markdown rendering, citation chips, New chat in brand header.
- **Team** (Account → Team): invite researchers/viewers; `/auth/accept-invite`.
- **Collect:** quota + close datetime settings; share pack (QR + print sheet); progress toward quota.
- **Builder:** interactive preview + minimal skip-logic editor (confirm/clear).
- **Reports:** Save as PDF / Word; **Download donor pack** ZIP; open via `?reportId=`.
- **Analytics:** Duplicate as endline + compare table; **saved views** (save/apply filters; optional reuse on report).
- Viewer role: mutate CTAs hidden (publish, generate report, etc.); Account nav Owner-only.
- Notifications drawer (clickable cards → href); Launchpot light theme chrome (`SurvaiPanel`, brand CTAs).
- Forms: RHF + Zod; TanStack Query.

---

## 5. Frontend — soft / gaps

- Full Playwright path needs staging creds (`E2E_*`). Assistant UI smoke sends a starter and waits for a reply.
- API pilots: `pilot_smoke.py` + `pilot_full_path.py` cover report → PDF → **assistant**.

---

## 6. Known next (priority)

1. Apply Alembic **0017/0018** on deployed DB; smoke invite + quota + donor pack.
2. On Render: leave `JOBS_USE_REDIS=false` (or unset) and clear `REDIS_URL` — no Upstash needed.
3. Run `pilot_full_path.py` / Playwright with staging `SMOKE_*` / `E2E_*` after deploy.

---

## 7. Files that matter

**Backend:** `app/api/v1/routes/{assistant,notifications,reports,...}.py`, `services/{assistant,collection,conditional_logic,knowledge_index,notification,report,...}.py`, `ai/{client,embeddings,prompts/assistant_v1.py}`, `models/assistant.py`, `alembic/versions/0016_org_assistant.py`, `Dockerfile`, `tests/test_{assistant,branching_and_reports,dicdo_features}.py`

**Frontend:** `features/assistant/**`, `features/builder/**` (skip preview/editor), `features/analytics/components/saved-analyses.tsx`, `components/chat-markdown.tsx`, `config/nav-config.ts`, `features/{reports,notifications,surveys,overview}/**`

---

## 8. Out of this snapshot

- Do not commit secrets (`GEMINI_API_KEY`, `FIRST_SUPERUSER_PASSWORD`, SMTP/Resend, `REDIS_URL`, DB URLs) into git.
