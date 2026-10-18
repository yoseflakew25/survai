# AI Survey Copilot — Technical Build Plan

> Source of truth: `CFA · TechLab · AI Survey Copilot PRD · 2026`.
> This document translates that PRD into an implementable architecture. It is
> the base context file for every AI-assisted coding session on this project.

---

## 0. How to Use This Document

- **Paste the whole file** as system/context when starting a new module with an
  AI coding assistant, or paste just the relevant numbered section(s) plus
  §6 (Data Model) and §17 (Env Vars), which almost every task depends on.
- **§12 (Feature Specs by Module)** maps every PRD requirement ID (`PLN-01`,
  `BLD-03`, `REV-02`, `COL-04`, `ANL-05`, `RPT-06`, …) to endpoints, tables,
  and implementation notes. When picking up a PRD requirement, start there.
- **§20 (Explicitly Out of Scope)** is a guardrail — if an AI suggestion
  drifts into template libraries, multi-language generation, offline
  collection, etc., point it back to that section.
- **§2a (Frontend stack enforcements)** is a hard gate for any `frontend/`
  work — shadcn, TanStack Query, RHF+Zod, Zustand, Better Auth (FE UX only).
  Real auth is **JWT + cookies** (§7). Reject alternate FE libraries.
- This plan assumes a solo/small-team build. It over-specifies schemas and
  contracts deliberately, because that's what keeps independent AI-assisted
  sessions (planner today, analytics next week) consistent with each other.

---

## 1. Product Summary & Non-Negotiable Principles

**Product:** AI Survey Copilot — an end-to-end AI-assisted survey lifecycle
platform (Plan → Build → Review → Publish → Collect → Analyze → Report → Ask).
**Pilot partner:** DICDO (Dire Integrated Community Development Organization),
via Code for Africa's AI for Good Fellowship. Designed to generalize beyond
one CSO, but DICDO is the only validated context for MVP.
**North Star:** DICDO deploys 10+ surveys and generates 20+ reports with
**0% statistical numerical hallucination**.

Two principles drive every architectural decision in this document:

1. **AI is used only for judgment, language, synthesis, and drafting**
   (objectives, question wording, review feedback, narrative prose, chat
   answers).
2. **Deterministic software is the only source of truth for numbers**
   (counts, percentages, means, cross-tabs). The LLM is never asked to
   calculate a statistic, and it is never given raw response rows — it only
   ever receives pre-computed, structured metric objects. §9 makes this
   concrete and enforceable in code, not just policy.

Everything else (versioning to protect historical response meaning, RBAC,
human-in-the-loop on every AI output, explainability) is a consequence of
these two rules.

---

## 2. Confirmed Decisions & Recommended Defaults

**Confirmed with you:**

| Decision | Choice |
| --- | --- |
| AI provider | **Gemini** (Google AI) via `google-genai` — OpenAI retired for this repo |
| Auth (real) | **JWT + httpOnly cookies** — FastAPI issues short-lived access JWT + refresh token in cookies; API validates JWT on every protected route. Users/roles live in Postgres. |
| Auth (frontend UX) | **Better Auth** — sign-in/sign-up UI, client helpers, Next.js route gating UX only. It does **not** replace JWT+cookies as the security model. |
| Deployment | Vercel (web) + Render/Railway (API) + managed Postgres |
| Frontend UI | **shadcn/ui** + Tailwind |
| Frontend server state | **TanStack Query** (`@tanstack/react-query`) |
| Frontend forms | **React Hook Form + Zod** (`zodResolver`) — every form |
| Frontend client UI state | **Zustand** |
| Validation / schemas (FE) | **Zod** |

Frontend library choices above are **non-negotiable for new work**. Auth security model is JWT+cookies (§7); Better Auth is FE UX only. See §2a.

**Recommended defaults for everything the PRD leaves open** (swappable —
override before building against them):

| Area | Default | Why |
| --- | --- | --- |
| Postgres host | **Aiven** for current local/dev (running); Neon/Render still fine for preview branches later | Managed Postgres + SSL; keep pool small (Aiven free ≈ 20 conns) |
| Queue/broker | Redis + **ARQ** (not Celery) | ARQ is asyncio-native, pairs directly with FastAPI's async style, far less boilerplate for a solo build |
| Object storage | Cloudflare R2 (S3-compatible) | Zero egress fees on exports users will download repeatedly; swap for AWS S3 with no code change (same API) |
| Analytics engine | Pandas (not Polars) | Simpler ecosystem, integrates cleanly with docxtpl/WeasyPrint export step; revisit Polars only if response volumes get large |
| DOCX export | `docxtpl` (Jinja2-templated `python-docx`) | Lets you template the DOCX shell once and inject structured report sections |
| PDF export | WeasyPrint over an HTML/Jinja2 template | Same template partials can render the in-app report preview and the PDF |
| FE ↔ API types | Zod-validated typed client from FastAPI OpenAPI (`openapi-typescript` + thin fetch wrapper) | Removes frontend/backend drift bugs |

---

## 2a. Frontend stack enforcements (do not violate)

Use this section as a hard gate in AI coding sessions. If a suggestion uses an
alternate library for any of these concerns, reject it and redirect here.

| Concern | Required | Forbidden (do not add) |
| --- | --- | --- |
| UI primitives | **shadcn/ui** in `frontend/src/components/ui/` | MUI, Chakra, Ant Design, raw Radix-only kits that bypass shadcn |
| Auth security | **JWT + httpOnly / Secure / SameSite cookies** (API is source of truth) | Access tokens in `localStorage` / `sessionStorage`; trusting client-only role claims |
| Auth FE UX | **Better Auth** for sign-in/up UI + client helpers that sit on top of JWT+cookies | Clerk; treating Better Auth as a second auth backend that bypasses FastAPI JWT |
| Server / async data | **TanStack Query** | SWR, ad-hoc `useEffect` + `fetch` for feature data, React Query v3 APIs |
| Forms | **React Hook Form + Zod** (`useForm` + `FormProvider` + `zodResolver`) | TanStack Form, Formik, uncontrolled `useState` form blobs for validated flows |
| Client UI state | **Zustand** | Redux, Jotai, Recoil for new global UI state |
| Schemas / validation | **Zod** | Yup, Joi, io-ts for new FE schemas |

**Form pattern (canonical):**

```tsx
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { /* … */ }
});

<FormProvider {...form}>
  <form onSubmit={form.handleSubmit(onSubmit)}>
    {/* fields from @/components/forms/fields or register/Controller */}
  </form>
</FormProvider>
```

**Data pattern (canonical):** feature `api/types.ts` → `api/service.ts` →
`api/queries.ts` (query key factories + `queryOptions`); pages prefetch with
TanStack Query; mutations invalidate via key factories.

**Also keep:** `nuqs` for URL table/filter state; icons only via
`@/components/icons` (Tabler registry) — never import icon packages in feature
files.

Agent-facing copies of this gate also live in:
`frontend/.cursor/rules/frontend-stack.mdc`, `frontend/AGENTS.md`, `PRODUCT.md`.

---

## 3. Tech Stack

### Frontend — `frontend/` (Next.js App Router; formerly planned as `apps/web`)
- **Next.js 16 (App Router), TypeScript (strict mode), React 19**
- Tailwind CSS v4 + **shadcn/ui**
- **Auth UX:** Better Auth for sign-in/sign-up UI and related client helpers; cookies carry JWT/refresh from the API
- **TanStack Query v5** (server state) + **Zustand** (local UI / wizard drafts)
- **React Hook Form + Zod** for all forms (`FormProvider` + field components in `src/components/forms/fields`)
- **nuqs** for URL search-param state (tables, filters, pagination)
- API client: generated from the backend's OpenAPI schema via `openapi-typescript` (types) + a thin typed fetch wrapper — regenerate on every backend schema change; send credentials (cookies) on API calls
- Charts: Recharts (distributions, cross-tabs)
- Rich text: Tiptap (report section editing) when needed
- Drag-and-drop: `@dnd-kit/*` (question/section reordering)
- Icons: `@tabler/icons-react` **only through** `src/components/icons.tsx`

### Backend — `backend/` (scaffold live; domain APIs still to build)
- **FastAPI, Python 3.12+**
- Pydantic v2 + pydantic-settings
- SQLAlchemy 2.0 (async) + Alembic + `asyncpg` (SSL for managed Postgres)
- **Clean architecture:** routes → services → repositories → models; DI via FastAPI `Depends`
- Auth: **JWT + httpOnly cookies** — `python-jose` access JWT; **bcrypt** (passlib) passwords; opaque refresh tokens hashed in DB; email OTP verify + password recovery (SMTP/Resend)
- Background jobs: ARQ + Redis *(not scaffolded yet)*
- Analytics: Pandas *(not scaffolded yet)*
- AI SDK: `openai` Python SDK + Responses API / Structured Outputs *(not scaffolded yet)*
- Report export: `docxtpl` / WeasyPrint *(not scaffolded yet)*
- Testing: `pytest`, `pytest-asyncio`, `httpx.AsyncClient` (auth + health suite green)
- Docker Compose (dev/prod) + Traefik labels; GH Actions `backend-ci.yml` / `backend-cd.yml`

### Data & Infra
- PostgreSQL (Aiven currently for dev — `defaultdb`; Docker Compose Postgres also available locally)
- Redis (Upstash or Render Redis) — ARQ queue + response caching *(later)*
- Object storage: Cloudflare R2 (or AWS S3)
- Hosting: Vercel (web), Docker Compose + Traefik (API) or Render/Railway
- CI/CD: GitHub Actions (backend lint/test/image; frontend TBD)
- Error tracking: Sentry (both apps)

### AI
- Provider: OpenAI, via the **Responses API**
- Models: parameterize per feature (`OPENAI_MODEL_PLANNER`, `OPENAI_MODEL_REVIEWER`, `OPENAI_MODEL_BUILDER`, `OPENAI_MODEL_REPORT`, `OPENAI_MODEL_CHAT`) rather than hardcoding a model string anywhere in business logic. OpenAI's lineup and naming move fast (multiple flagship revisions have shipped in 2026 alone) — check `https://platform.openai.com/docs/models` at implementation time and pick a current strict-structured-output-capable model for the judgment-heavy tasks (planner/reviewer/report) and a faster/cheaper variant for report chat, where latency matters more than depth.
- Every AI call goes through **one** service module (`app/ai/client.py`) — this is the "abstract the vendor behind a service layer" mitigation the PRD's risk table asks for (§17 risk: vendor/API dependency).

---

## 4. Repository Structure

**Actual layout (SurvAI repo):**

```
survai/
├── frontend/                    # Next.js App Router (live UI)
├── backend/                     # FastAPI (auth scaffold live)
│   ├── app/
│   │   ├── main.py
│   │   ├── core/                # config, security, exceptions
│   │   ├── db/                  # session, Base, SSL helpers
│   │   ├── models/              # User (RBAC), Organization, RefreshToken, PasswordResetToken (+ §6 later)
│   │   ├── schemas/
│   │   ├── repositories/
│   │   ├── services/            # auth, user, email
│   │   └── api/v1/routes/       # health, auth, users
│   ├── alembic/
│   ├── tests/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml  # Traefik + Let's Encrypt
│   └── README.md
├── .github/workflows/
│   ├── backend-ci.yml
│   └── backend-cd.yml
├── plan.md
├── status.md
└── PRODUCT.md
```

Still planned under `backend/app/` (not created yet): `ai/`, `analytics/`,
`reports/`, `jobs/` — see earlier architecture notes in this section’s history /
§8–§14. Frontend feature modules stay under `frontend/src/features/`.

---

## 5. System Architecture & Data Flow

```mermaid
flowchart LR
    subgraph Web[Next.js — frontend/]
      Planner[Planner UI]
      Builder[Builder UI]
      Reviewer[Reviewer UI]
      Collect[Public Collection Runtime]
      Dashboard[Analytics Dashboard]
      ReportUI[Report Workspace + Chat]
    end

    subgraph Api[FastAPI — backend/]
      RBAC[Auth / RBAC middleware]
      PlanSvc[Planner service]
      BuildSvc[Builder service]
      RevSvc[Reviewer service]
      ColSvc[Collection service]
      Engine[Deterministic analytics engine]
      RptSvc[Report service]
      ChatSvc[Report chat service]
    end

    subgraph AiLayer[AI orchestration — app/ai]
      Client[OpenAI Responses API client]
      Validator[Pydantic schema validator]
      Reconciler[Metric reconciliation check]
    end

    subgraph Store[Persistence]
      PG[(PostgreSQL)]
      Redis[(Redis: cache + ARQ queue)]
      S3[(Object storage: exports)]
    end

    Planner --> PlanSvc --> Client
    Builder --> BuildSvc --> Client
    Reviewer --> RevSvc --> Client
    Collect --> ColSvc --> PG
    Dashboard --> Engine --> PG
    ReportUI --> RptSvc
    RptSvc --> Engine
    RptSvc --> Client
    Client --> Validator --> Reconciler --> RptSvc
    ReportUI --> ChatSvc --> Client
    RptSvc --> S3
    BuildSvc --> PG
    RevSvc --> PG
    ChatSvc --> PG
    Api --> Redis
```

**Why this shape:** the AI orchestration layer sits *behind* every service
that touches an LLM, never in front of the database. No service writes an
LLM's numeric claim directly to `surveys`, `responses`, or a rendered
report — numbers only ever flow **out of** `Engine` (the analytics engine)
**into** the LLM as read-only structured input. This is the architectural
enforcement of the PRD's core principle in §1.

---

## 6. Data Model (PostgreSQL DDL)

Relational, because surveys/questions/versions/responses/analytics have
strong referential relationships and need transactional consistency — per
PRD §12. UUID primary keys throughout (shareable collection links, no
sequential-ID enumeration risk).

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- ============ Identity & Access ============

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MVP roles (VARCHAR in Alembic; values below). PRD §5 multi-seat personas
-- (researcher/viewer staff seats) are deferred until multi-user orgs ship.
-- system_admin = SurvAI platform operators (user management, full access)
-- organization = org workspace accounts (Planner → Report; default for signup)
CREATE TYPE user_role AS ENUM ('system_admin', 'organization');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    email CITEXT UNIQUE NOT NULL,
    hashed_password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'organization',
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_superuser BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Planning (§8.1 Planner) ============

CREATE TABLE survey_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID NOT NULL REFERENCES users(id),
    organization_id UUID REFERENCES organizations(id),
    research_goal TEXT NOT NULL,
    objectives JSONB NOT NULL DEFAULT '[]',
    research_questions JSONB NOT NULL DEFAULT '[]',
    target_respondents JSONB NOT NULL DEFAULT '[]',
    proposed_sections JSONB NOT NULL DEFAULT '[]',
    estimated_length_minutes INT,
    status TEXT NOT NULL DEFAULT 'draft',              -- draft | approved
    ai_generation_meta JSONB,                           -- {model, prompt_version, request_id, latency_ms}
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Surveys, Sections, Questions (§8.2/8.3 Builder) ============

CREATE TYPE survey_status AS ENUM ('draft', 'published', 'closed', 'archived');

CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID REFERENCES survey_plans(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES organizations(id),
    created_by UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    status survey_status NOT NULL DEFAULT 'draft',
    anonymous_collection BOOLEAN NOT NULL DEFAULT true,
    current_version_id UUID,                            -- FK added below, after survey_versions exists
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    order_index INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE question_type AS ENUM (
    'short_text', 'long_text', 'single_choice', 'multiple_choice',
    'dropdown', 'rating_scale', 'number', 'date'
);                                                       -- BLD-06 minimum set

CREATE TYPE question_source AS ENUM ('ai_generated', 'manual', 'ai_edited');

CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,  -- denormalized for query convenience
    type question_type NOT NULL,
    prompt_text TEXT NOT NULL,
    help_text TEXT,
    is_required BOOLEAN NOT NULL DEFAULT false,
    order_index INT NOT NULL,
    options JSONB,                -- [{id, label, value}] for choice/scale types
    validation_rules JSONB,       -- {min, max, min_length, max_length, regex}
    conditional_logic JSONB,      -- {operator: 'AND'|'OR', rules: [{question_id, op, value}]}
    source question_source NOT NULL DEFAULT 'manual',
    ai_generation_meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Versioning — protects historical response meaning ============
-- (PRD §10.2: "Survey versioning must prevent a published questionnaire
-- from changing the meaning of historical responses.")

CREATE TABLE survey_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    structure_snapshot JSONB NOT NULL,   -- frozen sections+questions tree at publish time
    published_by UUID NOT NULL REFERENCES users(id),
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (survey_id, version_number)
);

ALTER TABLE surveys
    ADD CONSTRAINT fk_current_version
    FOREIGN KEY (current_version_id) REFERENCES survey_versions(id);

-- ============ Reviewer (§8.4) ============

CREATE TABLE reviewer_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    overall_quality_score NUMERIC(3,1),   -- REV-06, advisory only, never "certification"
    estimated_completion_minutes INT,     -- REV-05
    required_question_count INT,          -- REV-05
    score_criteria JSONB,
    ai_generation_meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TYPE reviewer_issue_type AS ENUM (
    'leading_wording', 'double_barreled', 'ambiguous',
    'objective_misalignment', 'other'
);
CREATE TYPE reviewer_finding_status AS ENUM ('open', 'accepted', 'dismissed');

CREATE TABLE reviewer_findings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reviewer_report_id UUID NOT NULL REFERENCES reviewer_reports(id) ON DELETE CASCADE,
    question_id UUID REFERENCES questions(id) ON DELETE SET NULL,
    issue_type reviewer_issue_type NOT NULL,
    explanation TEXT NOT NULL,
    suggested_rewrite TEXT,
    status reviewer_finding_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Collection (§8.5) ============

CREATE TABLE respondents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    survey_version_id UUID NOT NULL REFERENCES survey_versions(id),
    session_token UUID NOT NULL DEFAULT gen_random_uuid(),
    is_anonymous BOOLEAN NOT NULL DEFAULT true,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    ip_hash TEXT,          -- sha256 of IP, never raw — data minimization (§14.1)
    user_agent TEXT
);

CREATE TABLE response_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    respondent_id UUID NOT NULL REFERENCES respondents(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES questions(id),
    survey_version_id UUID NOT NULL REFERENCES survey_versions(id),
    answer_value JSONB,    -- text | number | array (multi-select) | ISO date; NULL = explicitly skipped, never coerced to 0
    answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (respondent_id, question_id)
);
CREATE INDEX idx_response_answers_question ON response_answers(question_id);
CREATE INDEX idx_response_answers_version ON response_answers(survey_version_id);

-- ============ Analytics (§8.6) ============

CREATE TABLE saved_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    survey_version_id UUID NOT NULL REFERENCES survey_versions(id),
    created_by UUID NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    filters JSONB NOT NULL DEFAULT '[]',   -- stored so any chart/report is reproducible (§10.2)
    chart_config JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Reports (§8.7) ============

CREATE TYPE report_audience AS ENUM ('internal', 'donor', 'executive_summary');
CREATE TYPE report_status AS ENUM ('draft', 'final');

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    survey_version_id UUID NOT NULL REFERENCES survey_versions(id),
    created_by UUID NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    audience report_audience NOT NULL DEFAULT 'internal',
    status report_status NOT NULL DEFAULT 'draft',
    sections JSONB NOT NULL,             -- ReportGenerationOutput shape, see §8
    metrics_snapshot JSONB NOT NULL,     -- exact AnalyticsSnapshot passed to the LLM — the reconciliation source of truth
    ai_generation_meta JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE report_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    version_number INT NOT NULL,
    sections_snapshot JSONB NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (report_id, version_number)
);

CREATE TABLE report_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
    role TEXT NOT NULL,                  -- 'user' | 'assistant'
    content TEXT NOT NULL,
    metric_refs JSONB,                   -- keys into metrics_snapshot this answer drew on
    confidence TEXT,                     -- 'grounded' | 'partial' | 'insufficient_data' (assistant only)
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============ Exports, Observability, Audit ============

CREATE TYPE export_type AS ENUM ('docx', 'pdf', 'csv');
CREATE TYPE export_status AS ENUM ('pending', 'processing', 'completed', 'failed');

CREATE TABLE exports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID REFERENCES reports(id) ON DELETE CASCADE,
    survey_id UUID REFERENCES surveys(id) ON DELETE CASCADE,
    type export_type NOT NULL,
    status export_status NOT NULL DEFAULT 'pending',
    file_url TEXT,
    requested_by UUID NOT NULL REFERENCES users(id),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE ai_generation_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feature TEXT NOT NULL,               -- planner | builder | reviewer | report | report_chat
    user_id UUID REFERENCES users(id),
    prompt_version TEXT NOT NULL,
    model TEXT NOT NULL,
    input_meta JSONB,                    -- shape/summary only — never raw PII (§14.1)
    tokens_input INT,
    tokens_output INT,
    latency_ms INT,
    status TEXT NOT NULL,                -- success | schema_validation_failed | error
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Design notes an AI assistant should respect:**
- `response_answers` is per-question, per-respondent (not one JSON blob per
  submission) specifically so the analytics engine can filter/aggregate with
  plain SQL/Pandas groupbys — this is what makes ANL-01–ANL-04 tractable.
- `metrics_snapshot` on `reports` is not a cache — it is the audit trail. A
  report's displayed numbers must always be re-derivable by replaying this
  JSON, independent of the LLM call that generated the prose.
- Never write `answer_value = 0` for a skipped question. `NULL` means
  "missing," `0` means "answered zero" — conflating them breaks every
  percentage the PRD requires to be accurate (§10.2 Data Quality Rules).

---

## 7. Authentication & Authorization

**Security model: JWT + cookies.** Better Auth is **frontend UX only**
(sign-in/up screens, client helpers, Next.js gating UX) — it does not replace
FastAPI as the issuer/validator of credentials.

### Tenancy language (MVP)

- **Organization** = the account / workspace that owns surveys. Signup creates
  one org login that does **everything** (no staff seats yet).
- **User** (DB) = credential row for that org (1:1 for MVP). Not a separate
  “team member” product concept yet.
- **Respondent** = form-filler on public collection links — **no account**,
  never hits `/auth/register`.

### Real auth (API) — **implemented in `backend/`** (org accounts)

Live routes under `/api/v1`: `POST /auth/register` (organization account →
OTP emailed), `POST /auth/verify-email`, `POST /auth/resend-verification`,
`/auth/login`, `/auth/refresh`, `/auth/logout`, `GET /auth/me`,
`POST /auth/forgot-password`, `POST /auth/reset-password`.

- **Signup flow:** register creates org + user with `email_verified=false` →
  6-digit OTP (hashed in `email_verification_otps`, ~10 min TTL) →
  `verify-email` sets `email_verified=true` and issues tokens. Login is
  rejected until verified.
- **Login flow:** verify **bcrypt** hash → short-lived JWT access
  token (≈15 min) + opaque refresh token (stored hashed in `refresh_tokens`,
  rotated on use). Access JWT carries `sub` (user id) and `role`.
- **Transport:** tokens set as **httpOnly** cookies *and* returned in JSON so
  the Next.js client can use cookies (`credentials: 'include'`) and/or Bearer.
  Prefer cookies long-term; **do not** persist access tokens in
  `localStorage` / `sessionStorage` (current FE still uses `sessionStorage` —
  remove when wiring Better Auth UX properly).
- **Server-side authorization:** FastAPI deps (`get_current_user`,
  `require_roles`) check JWT then DB user row.
- **Refresh:** cookie or `{ refresh_token }` body; rotates refresh + issues new
  access token.
- **Password recovery:** `forgot-password` issues a one-time hashed token in
  `password_reset_tokens` (prior unused tokens invalidated); email carries a
  link to `{FRONTEND_URL}{PASSWORD_RESET_PATH}?token=…`. `reset-password`
  updates the bcrypt hash and revokes all refresh tokens. Delivery failures
  roll back the token (anti-enumeration still returns a generic 200).
- **Outbound email:** `app/services/email.py` — Gmail SMTP when
  `SMTP_ENABLED` + `SMTP_PASSWORD`, else Resend (`RESEND_API_KEY`), else
  console log (OTP may return `dev_code` only when delivery is unconfigured).
  Transactional HTML uses SurvAI brand tokens + embedded mark (`cid:survai-mark`).

### Frontend UX (auth pages + Better Auth)

- Live pages: `/auth/sign-in`, `/auth/sign-up` (form → OTP step),
  `/auth/forgot-password`, `/auth/reset-password?token=…` — RHF + Zod;
  `auth-context` wires `register` / `verifyEmail` / `resendVerification` /
  `requestPasswordReset` / `confirmPasswordReset` to the JWT+cookie API.
- Better Auth remains optional FE UX helpers on top of that API (not a second
  identity store). Prefer cookies (`credentials: 'include'`); **do not** put
  access tokens in `localStorage` (current FE still uses in-memory +
  `sessionStorage` fallback — remove when finishing FE↔API auth).
- Next.js layout gates for `/dashboard/*` should read the same cookie session
  the API trusts.
- **Do not:** reintroduce Clerk; do not invent a parallel Better Auth–only
  identity the API never sees.

### Roles & public routes (MVP RBAC — live)

MVP uses **two roles** (multi-seat PRD personas deferred until staff invites):

| Role | Who | Access |
| --- | --- | --- |
| `system_admin` | SurvAI operators (seeded from `FIRST_SUPERUSER_*`) | Full access + `/users` admin routes; `is_superuser=true` |
| `organization` | Every org signup / non-platform account | Org workspace: Planner → Build → Review → Collect → Analytics → Report |

- **Signup** always creates `role=organization` (never `system_admin`).
- **Bootstrap:** on API startup, `ensure_first_superuser()` creates/syncs the
  configured system admin and demotes every other account to `organization`.
- **Deps:** `require_roles(...)` / `AdminUser` gate admin routes to
  `system_admin` (superusers always pass).
- **Public routes:** only `/api/v1/public/*` collection endpoints (§11) are
  unauthenticated, scoped to one published `survey_version_id`.
- **Password policy:** bcrypt via passlib, min length enforced client- and
  server-side; no password fields in `ai_generation_logs` or `audit_log`
  input_meta.

**Later (post-MVP seats):** reintroduce PRD §5 staff roles (`researcher`,
`viewer`) *inside* an organization without renaming `system_admin`.

---

## 8. AI Orchestration Layer

Every AI feature is one function in `app/ai/services/`, calling the shared
`app/ai/client.py`, always with a strict JSON-schema `response_format`
derived from a Pydantic model in `app/ai/schemas.py`. No AI call in this
system ever returns free text without a schema.

| Feature (PRD §8) | Service function | Output schema | Grounding input |
| --- | --- | --- | --- |
| Survey Planner | `generate_survey_plan()` | `SurveyPlanOutput` | user's free-text research goal only |
| Builder — AI mode | `generate_survey_draft()`, `regenerate_section()` | `SurveyDraftOutput` | approved `survey_plans` row |
| Survey Reviewer | `review_survey()` | `ReviewerOutput` | current section/question tree |
| Report Generator | `generate_report()`, `regenerate_report_section()` | `ReportGenerationOutput` | `AnalyticsSnapshot` + curated `QualitativeExcerpt`s only — **never raw rows** |
| Report Chat | `answer_report_chat()` | `ReportChatOutput` | the report's `sections` + its `metrics_snapshot` only |

### Schemas (`app/ai/schemas.py`)

```python
from pydantic import BaseModel
from typing import Literal
from uuid import UUID
from datetime import datetime

# --- Planner ---
class ProposedSection(BaseModel):
    title: str
    rationale: str

class SurveyPlanOutput(BaseModel):
    objectives: list[str]
    research_questions: list[str]
    target_respondents: list[str]
    proposed_sections: list[ProposedSection]
    estimated_length_minutes: int
    notes: str | None = None

# --- Builder ---
class DraftQuestion(BaseModel):
    prompt_text: str
    type: Literal[
        "short_text", "long_text", "single_choice", "multiple_choice",
        "dropdown", "rating_scale", "number", "date",
    ]
    options: list[str] | None = None
    is_required: bool
    help_text: str | None = None

class DraftSection(BaseModel):
    title: str
    questions: list[DraftQuestion]

class SurveyDraftOutput(BaseModel):
    sections: list[DraftSection]

# --- Reviewer ---
class ReviewerFindingOutput(BaseModel):
    question_ref: str    # question_id, or "section_idx:question_idx" for unsaved drafts
    issue_type: Literal[
        "leading_wording", "double_barreled", "ambiguous",
        "objective_misalignment", "other",
    ]
    explanation: str
    suggested_rewrite: str | None = None

class ReviewerOutput(BaseModel):
    findings: list[ReviewerFindingOutput]
    overall_quality_score: float          # 1.0–5.0, advisory
    score_criteria: list[str]
    estimated_completion_minutes: int
    required_question_count: int

# --- Report generation & chat: the grounding contract (see §9) ---
class MetricValue(BaseModel):
    key: str               # e.g. "q3.percent_distribution.yes"
    label: str
    value: float | int | str
    unit: Literal["count", "percent", "mean", "median", "text"]

class QualitativeExcerpt(BaseModel):
    question_id: UUID
    respondent_id: UUID
    text: str

class AnalyticsSnapshot(BaseModel):
    survey_id: UUID
    survey_version_id: UUID
    generated_at: datetime
    response_count: int
    completion_rate: float
    metrics: list[MetricValue]
    qualitative_excerpts: list[QualitativeExcerpt]   # user-curated, capped (e.g. 20)

class GroundedStatement(BaseModel):
    text: str
    metric_ref: str | None   # must match a MetricValue.key, or null for a non-numeric claim

class ReportSection(BaseModel):
    heading: str
    statements: list[GroundedStatement]

class ReportGenerationOutput(BaseModel):
    executive_summary: ReportSection
    methodology: ReportSection
    respondent_profile: ReportSection
    key_findings: ReportSection
    recommendations: ReportSection
    conclusion: ReportSection

class ReportChatOutput(BaseModel):
    answer: str
    metric_refs: list[str]
    confidence: Literal["grounded", "partial", "insufficient_data"]
```

### Prompt structure (`app/ai/prompts/`)

One versioned module per feature (`planner_v1.py`, `reviewer_v1.py`,
`report_v1.py`, `chat_v1.py`). Each exports:
- `SYSTEM_PROMPT: str` — role + hard constraints (see §9 for the report/chat
  system prompt's non-negotiable rule).
- `build_user_prompt(...) -> str` — serializes the grounding input as JSON
  inside the prompt, never as prose the model has to re-parse.

Prompt **and** schema versions are logged per call (`ai_generation_logs.
prompt_version`), so a future prompt change never silently invalidates
reconciliation for reports generated under an older version.

### Call pattern (every service function)

```python
async def call_structured(feature: str, system: str, user: str,
                           schema: type[BaseModel], user_id: UUID) -> BaseModel:
    start = time.monotonic()
    resp = await openai_client.responses.create(
        model=MODEL_BY_FEATURE[feature],
        input=[{"role": "system", "content": system},
               {"role": "user", "content": user}],
        response_format={"type": "json_schema",
                          "json_schema": {"name": schema.__name__,
                                          "schema": schema.model_json_schema(),
                                          "strict": True}},
    )
    try:
        result = schema.model_validate_json(resp.output_text)
    except ValidationError as e:
        await log_ai_call(feature, user_id, status="schema_validation_failed", error=str(e))
        raise
    await log_ai_call(feature, user_id, status="success",
                       latency_ms=int((time.monotonic() - start) * 1000),
                       tokens_input=resp.usage.input_tokens,
                       tokens_output=resp.usage.output_tokens)
    return result
```

Retry policy: on `schema_validation_failed`, retry once with the validation
error appended to the user prompt ("your previous response failed schema X
because Y — fix and resend"); on second failure, surface a clear error to the
UI rather than silently degrading.

---

## 9. Anti-Hallucination & Grounding Architecture

This is the direct technical implementation of PRD §9.2.

**Rule enforced in code, not just in the prompt:** the report/chat system
prompt states *"You may only state a number that appears in the supplied
`metrics` array, referenced by its `key`. Any statement containing a number
must set `metric_ref` to that key. If the data doesn't support a claim, say
so — do not estimate, extrapolate, or infer."* — but the enforcement is the
**reconciliation validator**, which runs on every `ReportGenerationOutput`
and `ReportChatOutput` before it is persisted or shown to the user:

```python
# app/ai/reconciliation.py
def reconcile(statements: list[GroundedStatement], snapshot: AnalyticsSnapshot) -> list[str]:
    """Returns a list of violation messages; empty list = fully grounded."""
    metrics_by_key = {m.key: m for m in snapshot.metrics}
    violations = []
    for s in statements:
        if s.metric_ref is None:
            if _contains_digit(s.text):
                violations.append(f"Ungrounded numeric claim: {s.text!r}")
            continue
        metric = metrics_by_key.get(s.metric_ref)
        if metric is None:
            violations.append(f"metric_ref {s.metric_ref!r} not in snapshot")
        elif not _numeric_claim_matches(s.text, metric.value):
            violations.append(f"Stated value in {s.text!r} does not match {metric.value}")
    return violations
```

On violation: the offending section is **not** shown as-is. The service
either (a) retries generation once with the violation list appended as
feedback, or (b) on repeat failure, replaces the statement with a flagged
placeholder ("insufficient grounded data for this claim") and logs it — the
report is never silently published with an unverified number. This is what
makes "Report metric reconciliation rate: 100%" (PRD §16) enforceable rather
than aspirational.

**Corollary rules also enforced structurally:**
- The report/chat prompt builder **never** serializes raw `response_answers`
  rows — only the aggregated `AnalyticsSnapshot` and a capped, user-curated
  `qualitative_excerpts` list. There is no code path where an LLM sees a full
  response table.
- `metrics_snapshot` is stored on the `reports` row at generation time and
  never mutated afterward — regenerating a report section re-runs the
  analytics engine fresh and produces a new snapshot, so a report is always
  internally consistent with the snapshot it was built from.
- Empty/contradictory data: if `AnalyticsSnapshot.response_count` is below a
  configurable threshold (e.g. 5) for a given cross-tab cell, the analytics
  engine itself omits or flags that metric rather than passing a
  statistically meaningless number into the prompt at all.

---

## 10. Deterministic Analytics Engine

`app/analytics/engine.py` — pure functions over a `pandas.DataFrame` built
from `response_answers` for one `survey_version_id`. Every function must be:
independently unit-testable, deterministic given the same input rows, and
have zero dependency on the AI layer.

```python
def load_frame(survey_version_id: UUID, filters: list[Filter]) -> pd.DataFrame: ...
def response_count(df: pd.DataFrame) -> int: ...
def valid_count(df: pd.DataFrame, question_id: UUID) -> int: ...
def missing_count(df: pd.DataFrame, question_id: UUID) -> int: ...
def percent_distribution(df: pd.DataFrame, question_id: UUID) -> dict[str, float]: ...
def mean_median(df: pd.DataFrame, question_id: UUID) -> dict[str, float]: ...
def cross_tab(df: pd.DataFrame, q_a: UUID, q_b: UUID) -> pd.DataFrame: ...
def completion_rate(df: pd.DataFrame) -> float: ...
```

- **Filters** are a small DSL (`{"question_id": ..., "op": "eq"|"in"|"gt"|"lt"|"between", "value": ...}`),
  combined with AND (OR is a post-MVP enhancement, per PRD's freeze-scope
  risk mitigation). Filters applied to a chart/report are always persisted
  (`saved_analyses.filters` or `reports.metrics_snapshot`) — never
  recomputed silently from an unstored UI state, per PRD §10.2.
- **Denominator rules are explicit** (ANL-02): document, per statistic,
  whether the denominator is total respondents, valid (non-missing)
  responses for that question, or a filtered subset — and surface which one
  is in use in both the API response and the UI.
- **Caching:** results keyed by `(survey_version_id, filter_hash)` in Redis
  with a short TTL, invalidated on new response submission for that version.
  Never cache across `survey_version_id` boundaries.
- **Reconciliation testing (§18):** build a fixture dataset with hand-computed
  expected statistics; CI asserts every engine function against it on every
  PR touching `app/analytics/`.

---

## 11. REST API Surface

All authenticated routes under `/api/v1`, JSON in/out, versioned from day one.

| Resource | Method & path | Notes |
| --- | --- | --- |
| Auth | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` | |
| Users (`system_admin`) | `GET/POST /users`, `PATCH/DELETE /users/{id}` | platform admin only; org self-registration remains via `/auth/register` |
| Plans | `POST /plans`, `POST /plans/{id}/generate`, `GET/PATCH /plans/{id}`, `POST /plans/{id}/approve` | PLN-01–05 |
| Surveys | `POST/GET /surveys`, `GET/PATCH/DELETE /surveys/{id}` | |
| Builder — AI | `POST /surveys/{id}/generate`, `POST /surveys/{id}/sections/{sid}/regenerate` | BLD-01, BLD-02 |
| Builder — manual | `POST/PATCH/DELETE /surveys/{id}/sections`, `POST/PATCH/DELETE /surveys/{id}/questions`, `POST /surveys/{id}/questions/reorder` | BLD-05–08 |
| Publish | `POST /surveys/{id}/publish`, `GET /surveys/{id}/preview` | creates a `survey_versions` row |
| Reviewer | `POST /surveys/{id}/review`, `GET /surveys/{id}/review/latest`, `PATCH /reviewer-findings/{id}` | REV-01–06 |
| Collection (public, unauthenticated) | `GET /public/surveys/{version_id}`, `POST /public/surveys/{version_id}/respondents`, `POST /public/respondents/{id}/answers`, `POST /public/respondents/{id}/complete` | COL-01–05 |
| Analytics | `GET /surveys/{id}/analytics/summary`, `POST /surveys/{id}/analytics/query`, `POST /surveys/{id}/analytics/crosstab`, `POST /surveys/{id}/analytics/export`, `GET/POST /surveys/{id}/saved-analyses` | ANL-01–06 |
| Reports | `POST /surveys/{id}/reports`, `GET/PATCH /reports/{id}`, `POST /reports/{id}/sections/{key}/regenerate`, `POST /reports/{id}/export`, `GET /exports/{id}` | RPT-01,02,05,06 |
| Report chat | `POST /reports/{id}/chat`, `GET /reports/{id}/chat/history` | RPT-04 |

`POST /reports/{id}/export` and `POST /surveys/{id}/generate` (long AI
generations) return `202 Accepted` + a job/export id, per the "long AI
actions need visible progress, no blank waiting screens" NFR (§13). The
frontend polls or subscribes to job status.

---

## 12. Feature Specs by Module — PRD Requirement Traceability

| ID | Requirement | Implementation |
| --- | --- | --- |
| PLN-01 | Free-text goal → structured draft plan | `POST /plans` stores `research_goal`; `POST /plans/{id}/generate` calls `generate_survey_plan()` |
| PLN-02 | Editable objectives/research questions | Plan fields are plain JSONB arrays, PATCH-able like any form field |
| PLN-03 | Target respondents/sections as suggestions | UI renders as editable, not read-only, cards |
| PLN-04 | Estimated length, labeled as estimate | `estimated_length_minutes` always rendered with an "estimate" badge in the UI |
| PLN-05 | Plan edits persist to builder | `surveys.plan_id` FK; builder reads the *approved* plan snapshot at generation time |
| BLD-01 | First draft from approved plan | `generate_survey_draft()` → creates `sections`+`questions` rows, `source='ai_generated'` |
| BLD-02 | Regenerate one section | `regenerate_section()` scoped to a single `section_id`, other sections untouched |
| BLD-03 | Every AI element editable | No `is_locked` flag anywhere in the schema — by construction, nothing is immutable |
| BLD-04 | AI-suggested conditional logic, human-confirmed | AI writes to a `pending_conditional_logic` UI state, not directly to `questions.conditional_logic`, until the user confirms in the preview |
| BLD-05–08 | Manual CRUD, question types, required/optional, branching | Standard REST CRUD on `sections`/`questions`; `conditional_logic` JSON DSL evaluated client-side in preview and server-side at submission |
| REV-01–03 | Leading wording, double-barreled, ambiguity | `ReviewerFindingOutput.issue_type` enum; explanation + rewrite always present |
| REV-04 | Objective ↔ question alignment | Reviewer prompt is given both the plan's `objectives` and the current question set |
| REV-05 | Burden estimate | `estimated_completion_minutes` + `required_question_count` on `ReviewerOutput` |
| REV-06 | Quality summary, advisory | `overall_quality_score` always rendered with `score_criteria`, and UI copy explicitly labels it "advisory, not certification" |
| COL-01–05 | Publish link, reliable capture, anonymous mode, progress, validation | Public routes scoped to `survey_version_id`; `response_answers` write is the transactional unit — a failed submit retries without duplicating (idempotency key = `respondent_id`+`question_id` unique constraint) |
| ANL-01–06 | Counts, percentages, filters, cross-tabs, charts, export | §10 engine; UI charts render directly from the same `/analytics/query` response the table uses — never a separately-computed number |
| RPT-01,02 | Generate from validated results, standard sections | `generate_report()`; §9 grounding |
| RPT-03 | Audience/tone selection | `reports.audience` enum drives prompt variant, not post-hoc text replacement |
| RPT-04 | Report chat, grounded | `answer_report_chat()`; §9 reconciliation applies identically to chat |
| RPT-05 | Edit + regenerate individual sections | `PATCH /reports/{id}` for manual edits; `POST .../sections/{key}/regenerate` re-runs just that section against the *same* stored `metrics_snapshot` |
| RPT-06 | DOCX/PDF export | §13 pipeline |

---

## 13. Report Generation & Export Pipeline

1. `POST /surveys/{id}/reports` → engine computes a fresh `AnalyticsSnapshot`
   (§10) → `generate_report()` (§8) → §9 reconciliation → persisted to
   `reports.sections` + `reports.metrics_snapshot`.
2. **In-app editing:** `PATCH /reports/{id}` for direct text edits;
   `POST /reports/{id}/sections/{key}/regenerate` re-runs generation for one
   section only, reusing the existing `metrics_snapshot` (no silent
   re-computation of numbers mid-edit).
3. **Export (async, via ARQ job):**
   - DOCX: `docxtpl` renders a Jinja2-templated `.docx` shell with the
     report's `sections` injected.
   - PDF: the same section data renders into an HTML/Jinja2 template
     (shared partials with the in-app report preview) → WeasyPrint → PDF.
   - Job writes the file to object storage, updates `exports.status` and
     `file_url`; the frontend polls `GET /exports/{id}`.

---

## 14. Background Jobs & Async Processing

ARQ worker (`backend/app/jobs/`), separate Render/Railway service from the
API, sharing the same Redis instance as the cache.

| Job | Trigger | Notes |
| --- | --- | --- |
| `generate_report_job` | `POST /surveys/{id}/reports` | long-running AI call, returns job id immediately (§11) |
| `export_report_job` | `POST /reports/{id}/export` | DOCX/PDF rendering |
| `export_analytics_csv_job` | `POST /surveys/{id}/analytics/export` | large exports off the request/response cycle |
| `survey_draft_job` (optional, if generation latency warrants it) | `POST /surveys/{id}/generate` | same async pattern as report generation |

All jobs are idempotent on retry (safe to re-run with the same input) and
update a status row the frontend can poll — never leave a UI on a bare
spinner with no backing state, per the AI-latency NFR.

---

## 15. Non-Functional Requirements → Implementation Notes

| PRD requirement | Implementation |
| --- | --- |
| Page interactions < 2.5s excl. AI generation | TanStack Query caching + server-side pagination on any list endpoint returning >50 rows |
| Visible AI progress, no blank waits | Every long AI action is a 202+job pattern (§11, §14) with a progress UI, never a bare loading spinner with no state |
| No response loss on UI failure | `response_answers` unique constraint + client-side optimistic local buffer with retry-on-failure before navigating away |
| HTTPS, secure secrets, server-side authz, parameterized queries | Managed hosting TLS by default; secrets via Render/Vercel env vars, never committed; SQLAlchemy parameterizes all queries by construction; `require_role()` dependency on every route |
| WCAG 2.1 AA-aligned | shadcn/ui (Radix primitives) as the component base — keyboard nav and ARIA come largely for free; still requires manual contrast/labeling review per screen |
| Mobile-responsive respondent experience | Collection routes (`/s/[versionId]`) built mobile-first, tested at 360px width minimum |
| Observability without exposing survey content | `structlog` structured logs; `ai_generation_logs.input_meta` stores shape/summary, never raw response text; Sentry scrubbing rules exclude `response_answers.answer_value` |
| Versioned AI prompts/schemas | `ai/prompts/*_v1.py` naming convention + `prompt_version` logged per call (§8) |

---

## 16. Security, Privacy & Compliance Implementation

Directly implementing PRD §14:

- **Data minimization:** only collect fields the plan's stated objective
  requires — enforced at the product/UX level (builder nudges against
  unnecessary identifying fields), not just policy.
- **Identity separation:** `respondents` never stores a name/email/phone
  field in anonymous mode — `is_anonymous=true` surveys have no schema path
  to capture identifying fields at all in MVP.
- **RBAC:** §7.
- **No direct identifiers in AI prompts:** prompt builders in `app/ai/
  prompts/` take structured, pre-filtered inputs (plan text, question text,
  `AnalyticsSnapshot`) — never a raw `respondents`/`response_answers` join.
- **Retention:** MVP default — response data retained indefinitely unless
  DICDO specifies a retention window during discovery (open question, §21);
  build the deletion path (`DELETE /surveys/{id}` cascades) now so a
  retention job is a scheduling problem later, not a schema migration.
- **AI action logging without a second uncontrolled data copy:**
  `ai_generation_logs.input_meta` is explicitly typed to exclude raw
  response text (§6 design notes).
- **Responsible AI framing in UI copy:** reviewer findings labeled
  "potential issues," report content labeled AI-assisted, quality score
  labeled "advisory" — this is a UI/copy requirement to carry into every
  screen, not just a backend concern.

---

## 17. Environment Variables

```bash
# --- backend/.env (gitignored; see backend/.env.example) ---
ENVIRONMENT=development
DATABASE_URL=postgresql+asyncpg://USER:PASSWORD@HOST:PORT/defaultdb
DATABASE_SSL=true                 # required for Aiven / most managed Postgres
# DATABASE_SSL_CA=./certs/aiven-ca.pem   # optional full cert verify
DATABASE_POOL_SIZE=5
DATABASE_MAX_OVERFLOW=5

CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000

JWT_SECRET_KEY=
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=14
COOKIE_SECURE=false
COOKIE_SAMESITE=lax

FIRST_SUPERUSER_EMAIL=yoseflakewdev@gmail.com   # platform system_admin
FIRST_SUPERUSER_PASSWORD=                       # synced on API startup
FIRST_SUPERUSER_FULL_NAME=SurvAI System Admin
FIRST_SUPERUSER_ORGANIZATION_NAME=SurvAI

FRONTEND_URL=http://localhost:3000
PASSWORD_RESET_PATH=/auth/reset-password

# Outbound email — prefer SMTP (e.g. Gmail app password) or Resend.
# If neither is configured, OTP is logged + returned as `dev_code` (dev only).
SMTP_ENABLED=true
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=                    # Gmail app password; spaces stripped
SMTP_TLS=true
EMAILS_FROM_EMAIL=                # typically same as SMTP_USER for Gmail
EMAILS_FROM_NAME=SurvAI
# RESEND_API_KEY=                 # optional alternative to SMTP

# Later:
# REDIS_URL=
# OPENAI_API_KEY=
# OPENAI_MODEL_*=

# --- frontend/.env ---
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_AUTH_BASE_URL=http://localhost:3000
NEXT_PUBLIC_SENTRY_DISABLED=true

# Better Auth (FE UX helpers only — does not replace JWT_SECRET / cookie auth)
```

---

## 18. Build Roadmap — 8 Weeks → Technical Milestones

Mapping PRD §15 onto concrete deliverables:

| Week | PRD focus | Technical milestones |
| --- | --- | --- |
| 1 | Discovery + architecture | ✅ Repo + auth scaffold; JWT+cookies; Aiven Postgres; MVP RBAC; email OTP verify + forgot/reset password UI; branded SMTP/Resend mail; backend CI/CD. Next: full §6 domain Alembic; FE↔API auth without mock/sessionStorage; AI client skeleton (§8) |
| 2 | Planner + survey model | PLN-01–05 fully working; `surveys`/`sections`/`questions` CRUD; plan→survey handoff |
| 3 | Builder | BLD-01–08; drag-and-drop reorder; live preview; conditional logic DSL (draft, unconfirmed) |
| 4 | Reviewer + collection | REV-01–06; `survey_versions` publish flow; public collection routes COL-01–05 |
| 5 | Analytics engine | §10 engine + fixture-based reconciliation tests; ANL-01–06 endpoints + dashboard UI |
| 6 | Report generation | §9 grounding/reconciliation live; RPT-01–03; report workspace UI |
| 7 | Report chat + hardening | RPT-04; export pipeline (§13); permissions audit; error-state UI for every async job |
| 8 | Pilot + polish | DICDO user testing against real/representative data; fix list; docs; demo script |

## 18a. Frontend UI implementation notes (update this section as the UI progresses)

The frontend is a single Next.js App Router app at `frontend/`. The roadmap
above still defines the product/week shape; UI work has been implementation-
first: shell → survey hub → module pages.

Current UI reality is tracked in `status.md`. Stack enforcements are in **§2a**
— follow those for every new frontend change.

- **Stack gate.** New UI must use shadcn + TanStack Query + RHF/Zod + Zustand.
  Auth security = JWT+cookies (§7); Better Auth = FE UX only. Forms already
  migrated off TanStack Form; do not reintroduce it.
- **Nav and shell.** Sidebar nav is driven by `src/config/nav-config.ts`; every
  nav icon key must exist in `src/components/icons.tsx` before it lands
  (`AppSidebar` renders `Icons[item.icon]` — missing keys render nothing).
- **Survey module consistency.** Hub + Build / Review / Collect / Analytics /
  Reports should share header + stepper treatment so modules read as one system.
- **Respondents.** List: heading, then sort/stats/toolbar row; status as column
  header filter; search in column header. Detail: prefilled survey-form look,
  not a generic key/value dump.
- **Mock work is explicit.** Auth API is live; survey/plan/analytics/report
  feature data is still mock. When wiring real data, use
  `api/types → service → queries` + TanStack Query — not ad-hoc fetch.
  Point `NEXT_PUBLIC_API_BASE_URL` at the FastAPI `/api/v1` base.

---

## 19. Testing Strategy

- **Unit (pytest):** every `app/analytics/engine.py` function against a
  fixture dataset with hand-computed expected values — this is the ANL-01
  "counts reconcile exactly" acceptance criterion made automatic. Also: the
  §9 reconciliation validator, tested against deliberately-poisoned
  (ungrounded) `ReportGenerationOutput` fixtures.
- **Integration (pytest + httpx.AsyncClient):** full request/response cycle
  per router, including RBAC (an `organization` token must 403 on
  `/users` admin routes; only `system_admin` may manage users), against a
  test Postgres schema.
- **AI evaluation (PRD §18.2), not unit tests:** a fixed test set of
  intentionally-flawed questions run through `review_survey()`, asserting
  the expected `issue_type`s are flagged; a fixed known-dataset run through
  `generate_report()`, asserting every numeric statement passes
  reconciliation; adversarial prompts ("what is the true cause of X?") to
  confirm the system states a limitation instead of inventing a causal
  claim.
- **E2E (Playwright):** one full path per persona — plan → build → review →
  publish → collect (seed responses via the public API) → analyze → report →
  chat — run in CI against a throwaway database.

---

## 20. Explicitly Out of Scope (MVP) — do not build these

Per PRD §7.2. If an AI coding session proposes any of these, redirect it here:

- Survey-to-survey comparison across time
- External survey imports (CSV/XLSX/Kobo-style exports)
- Multilingual survey generation and translation
- Offline-first mobile collection
- Advanced sampling and weighting
- Reusable survey templates / organization-wide libraries
- Integrations with external data-collection systems

---

## 21. Open Questions (from PRD §19 — unresolved, confirm with DICDO)

These are not technical unknowns — they're product/discovery unknowns that
will shape config, not architecture, once answered:

- Which survey types does DICDO conduct most frequently?
- Current collection methods (paper, Google Forms, KoboToolbox, ODK, spreadsheets)?
- Typical survey frequency and response dataset size?
- Required report formats for DICDO and its partners?
- Required languages for survey authoring and respondent collection?
- What data must stay inside the organization vs. what may reach a third-party model provider?
- What quality checks do DICDO's M&E/program staff already use?
- Which statistical methods beyond descriptive analysis/cross-tabs are genuinely needed?
- Which of the proposed success metrics become official fellowship measures?

---

## 22. Appendix: Glossary

(Carried from PRD §20 — keep terminology consistent across code, UI copy, and prompts.)

| Term | Meaning |
| --- | --- |
| Survey | A structured set of questions used to collect information from respondents |
| Survey Planner | Defines why the survey exists and what it should measure |
| AI Survey Builder | Generates a draft questionnaire from a research goal |
| Survey Reviewer | Checks questions for common quality problems, suggests improvements |
| Deterministic analytics | Calculations from normal software logic — same input always yields same output |
| Cross-tabulation | A table comparing responses across two variables |
| LLM | Large Language Model |
| Prompt | Instructions sent to an AI model to guide its response |
| RAG | Retrieval-Augmented Generation |
| Human-in-the-loop | A person reviews and controls AI output rather than the AI acting autonomously |
| MVP | Minimum Viable Product |

## 22a. Appendix: Frontend source-of-truth files for UI work

When picking up a UI task, start from these files instead of inferring structure
from screenshots or older sessions:

- `frontend/src/config/nav-config.ts` — sidebar/nav items and their icon keys
- `frontend/src/components/icons.tsx` — icon registry (`Icons` record)
- `frontend/src/components/layout/app-sidebar.tsx` — sidebar renderer
- `frontend/src/hooks/use-logo.ts` — logo path/alt logic
- `frontend/src/app/dashboard/surveys/[surveyId]/page.tsx` — survey hub
- `frontend/src/app/dashboard/surveys/[surveyId]/respondents/page.tsx` — respondents shell + skeleton
- `frontend/src/features/respondents/components/respondents-view.tsx` — respondents UI
- `frontend/src/features/respondents/components/columns.tsx` — respondents table columns + header filters
- `frontend/src/features/respondents/components/respondent-detail-view.tsx` — respondent detail
- `status.md` — current UI progress snapshot
- `frontend/.cursor/rules/frontend-stack.mdc` — stack enforcement rule (§2a)

`plan.md` is the architectural source of truth; `status.md` is the current
implementation snapshot (frontend + backend). If they disagree, status.md is
usually the more recent picture of what is running. For library choice
conflicts, **§2a wins**.

---

## 23. Implementation Status (as of October 2026)

> Tracks frontend + backend. Survey domain data on the FE is still largely mock;
> auth API + Postgres users/RBAC are real. Update as milestones ship.

### ✅ Completed — Backend (`backend/`)

| Module | Status | Notes |
| --- | --- | --- |
| **Scaffold** | ✅ Done | FastAPI, clean arch, DI, type hints, CORS, Docker Compose, Traefik prod labels |
| **Auth API (§7 core)** | ✅ Done | register → email OTP → verify; login/refresh/logout/me; forgot/reset password; JWT + cookies; bcrypt; refresh tokens in DB |
| **Email delivery** | ✅ Done | SMTP (Gmail) and/or Resend; branded HTML + SurvAI mark CID; `dev_code` only when mail unconfigured |
| **AI gateway + Planner** | ✅ Milestone 1 | Gemini `app/ai/client.py`; `POST /plans` + `/plans/generate` + `/plans/{id}/generate`; `survey_plans` + `ai_generation_logs` |
| **RBAC (MVP)** | ✅ Done | Roles: `system_admin` \| `organization`; signup → organization; startup seeds/syncs platform admin from `FIRST_SUPERUSER_*`; demotes others; `AdminUser` → `system_admin` |
| **Users** | ✅ Partial | model + admin list/get/update routes gated by `system_admin`; org profile self-service on `/auth/me` |
| **Organizations** | ✅ Partial | 1:1 with login; name + description + website on profile |
| **Postgres** | ✅ Dev live | Aiven; Alembic through `0007_survey_plans` |
| **Tests / CI** | ✅ Done | Pytest auth + plans (mocked Gemini) + health; GH Actions backend-ci + backend-cd (GHCR) |

### ✅ Completed — Frontend

| Module | Pages / Components | Status | Notes |
| --- | --- | --- | --- |
| **Auth UI** | Sign-in, Sign-up + OTP, Forgot / Reset password | ✅ Done | RHF + Zod; live API via `auth-context`; still falls back to mock user + `sessionStorage` access token |
| **Plans UI** | New Survey + plan editor | ✅ Milestone 1 | `plans/api/service.ts` → live `/plans` + Gemini generate |
| **Forms stack** | All FE forms on RHF + Zod | ✅ Done | TanStack Form removed; field components under `components/forms/fields` |
| **Sidebar Navigation** | App sidebar with collapsible/expandable modes | ✅ Done | Logo variants (light/dark × collapsed/expanded); primary icon colors; user dropdown |
| **Dashboard Overview** | Stat cards, Recent Plans, Quick Actions | ✅ Done | Outline-style cards; primary color accents; grid pattern backgrounds |
| **Surveys List** | Surveys page with data table, search, filter, sort | ✅ Done | Professional shadcn-style table; column-based sorting; status badges |
| **New Survey Modal** | Wizard → generate plan → `/dashboard/plans/{id}` | ✅ Done | Plan is first lifecycle step; pill nav Plan→Review→Collect→Analytics→Report |
| **Plan Editor** | Plan review/edit with SurvaiPanels | ✅ Done | EditableList/sections; stepper; Unsaved/Ready badges; **Back to Surveys** |
| **Survey Review** | Question review with inline editing | ✅ Done | Sections/questions layout; **Back to Surveys**; no fake “generation theater” |
| **Collect** | Publish flow, collection link, QR code | ✅ Done | Preview rename; progress; copy link; publish toggle |
| **Analytics Dashboard** | Summary stats, distributions, cross-tabs | ✅ Done | Recharts integration; saved analyses sidebar |
| **Report Workspace** | Editable sections, chat sidebar, export buttons | ✅ Done | Chat restyle; section editing; DOCX/PDF export triggers |
| **Settings** | Organization settings page | ✅ Done | Professional card-based layout |
| **Notifications** | Notifications list | ✅ Done | Outline-style notification cards |
| **Profile** | User profile page | ✅ Done | Avatar upload, form validation, activity section |

### 🔄 In Progress

| Module | Status | What's Left |
| --- | --- | --- |
| **FE ↔ API auth** | Partial | Remove mock user + `sessionStorage`; cookie-only / Better Auth UX on live JWT API |
| **§6 domain schema** | Not migrated | plans, surveys, sections, questions, versions, respondents, analytics, reports tables |
| **AI Integration** | Mock only | OpenAI Responses API; all FE AI still `setTimeout` |
| **Collection Route** | Partial | `/s/[versionId]` exists; needs real respondent flow against public API |

### ❌ Not Started (domain + AI)

| Module | PRD Ref | Priority |
| --- | --- | --- |
| **Backend Plans CRUD** | §11 | P0 |
| **Backend Surveys/Sections/Questions** | §11 | P0 |
| **Backend Reviewer** | §11 | P1 |
| **Backend Analytics Engine** | §10 | P1 |
| **Backend Reports + Export** | §13 | P1 |
| **Background Jobs (ARQ)** | §14 | P1 |
| **AI Orchestration Layer** | §8 | P1 |
| **Anti-Hallucination Reconciliation** | §9 | P1 |
| **E2E Tests (Playwright)** | §19 | P2 |

---

## 24. Frontend Architecture — Current State

### Directory Structure (actual)

```
frontend/src/
├── app/
│   ├── auth/                            # sign-in, sign-up (+OTP), forgot-password, reset-password
│   ├── dashboard/
│   │   ├── layout.tsx                   # sidebar + topbar shell
│   │   ├── page.tsx                     # overview redirect
│   │   ├── overview/                    # @pie_stats, @surveys parallel routes
│   │   ├── surveys/
│   │   │   ├── page.tsx                 # surveys list with data table
│   │   │   └── [surveyId]/
│   │   │       ├── review/page.tsx      # survey review + inline editing
│   │   │       ├── collect/page.tsx     # publish + collection link
│   │   │       ├── analytics/page.tsx   # charts + cross-tabs
│   │   │       └── reports/page.tsx     # report editor + chat
│   │   ├── plans/
│   │   │   ├── page.tsx                 # plans list
│   │   │   └── [planId]/page.tsx        # plan editor (review + edit)
│   │   ├── settings/page.tsx            # organization settings
│   │   ├── notifications/page.tsx       # notifications list
│   │   └── profile/page.tsx             # user profile
│   └── s/[versionId]/                   # public respondent collection
├── features/
│   ├── auth/                            # login/register forms
│   ├── builder/                         # survey types, mock service, queries
│   ├── reviewer/                        # findings list, quality score, queries
│   ├── analytics/                       # summary stats, distributions, cross-tabs
│   ├── reports/                         # report view + chat
│   ├── collect/                         # collect view (publish/link)
│   ├── plans/                           # plan editor, editable list, sections
│   ├── surveys/                         # survey tables, new survey dialog
│   ├── overview/                        # stat cards, recent plans
│   ├── settings/                        # settings components
│   ├── notifications/                   # notification components
│   └── profile/                         # profile components
├── components/
│   ├── ui/                              # shadcn/ui primitives
│   ├── layout/                          # page-container, app-sidebar
│   ├── breadcrumbs.tsx
│   └── icons.tsx                        # tabler icon mappings
├── hooks/
│   └── use-undo-redo.ts                 # generic undo/redo hook
├── styles/
│   └── themes/                          # CSS custom properties
├── config/
│   └── nav-config.ts                    # sidebar navigation items
└── lib/
    └── utils.ts                         # cn() helper
```

### User Flow — Implemented

```
1. New Survey → Plan (first step)
   Dialog → AI plan draft → /dashboard/plans/{planId}
   (existing surveys with planId → /surveys/{id}/plan)

2. Plan Editor (/dashboard/plans/{planId} or /surveys/{id}/plan)
   Refine goal/objectives/questions/respondents/sections
   Back to Surveys · Build survey when ready

3. Pill nav (shared): Plan → Review → Collect → Analytics → Report

4. Survey Review (/dashboard/surveys/{id}/review)
   Sections + questions; inline edit; Back to Surveys

5. Collect → Analytics → Report
   Publish/link · charts · grounded report chat (UI mock until APIs)
```

### Styling System

- **Primary palette:** `ultrasonic-blue` (purple: #6722dd)
- **Card style:** Outline (border, no shadow unless hover)
- **Progress indicators:** Rounded step badges with ✓/number
- **Primary action cards:** `bg-primary` + white grid pattern + secondary button
- **Dark mode:** Full support via CSS custom properties
- **Sidebar:** Collapsible with logo variants, primary-colored icons

---

## 25. Next Milestones

| Priority | Task | PRD Ref |
| --- | --- | --- |
| P0 | Alembic §6 domain schema + Plans/Surveys CRUD APIs | §6, §11 |
| P0 | Finish FE auth against live API (drop mock/`sessionStorage`; Better Auth UX) | §7, §2a |
| P0 | Connect survey/plan features to API via TanStack Query service layer | §11, §2a |
| P0 | Build public collection route with real respondent flow | COL-01–05 |
| P1 | Add real-time response counter on Collect page | COL-04 |
| P1 | Implement report export with actual DOCX/PDF generation | §13 |
| P1 | Add loading skeletons for all async pages | §15 |
| P2 | Add drag-and-drop section reorder on Review page | BLD-07 |
| P2 | Implement conditional logic preview in Review | BLD-04 |
| P2 | Add E2E tests with Playwright | §19 |
