<h1 align="center">Survey Copilot</h1>

<div align="center">AI-assisted survey lifecycle platform — plan, build, review, collect, analyze, and report.</div>

<div align="center">
  <img src="/shadcn-dashboard.png" alt="Survey Copilot Cover" style="max-width: 100%; border-radius: 8px;" />
</div>

<br />

<p align="center">
  <a href="https://github.com/PAVILION/Survey-Copilot/stargazers"><img src="https://img.shields.io/github/stars/PAVILION/Survey-Copilot?style=social" alt="GitHub stars" /></a>
  <a href="https://github.com/PAVILION/Survey-Copilot/network/members"><img src="https://img.shields.io/github/forks/PAVILION/Survey-Copilot?style=social" alt="Forks" /></a>
  <a href="https://github.com/PAVILION/Survey-Copilot/blob/main/LICENSE"><img src="https://img.shields.io/github/license/PAVILION/Survey-Copilot" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/Next.js-16-black" alt="Next.js" />
  <img src="https://img.shields.io/badge/Tailwind-v4-90CDF4" alt="Tailwind CSS" />
</p>

## Overview

Survey Copilot is a full-stack admin dashboard for building and managing surveys from ideation through analysis. It is built on Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, and shadcn/ui on Base UI primitives.

The template has been trimmed to the survey workflow: no auth provider is wired in yet (login/sign-up renders a UI stub), no organizations, billing, kanban, or chat. What remains is a lean, working foundation focused on surveys, respondents, collection, and analytics.

### What is included

- **Dashboard overview** — summary cards and charts anchored to recent surveys
- **Survey list** — TanStack Table with React Query prefetch, client cache, and nuqs URL state for search, filter, and pagination
- **Survey builder** — section + question editor with an AI-assisted generation panel (mock flow)
- **Collection** — publish survey, share collection link/QR, and watch live response stats
- **Respondents** — list and drill into individual responses
- **Analytics** — question distributions, cross-tab analysis, and saved analyses per survey
- **Reports** — per-survey report view
- **Forms showcase** — basic, advanced, multi-step, and sheet forms built with TanStack Form + Zod
- **Authentication UI** — sign-in and sign-up pages render a form stub; wiring to a real backend is pending
- **Settings + Notifications + Profile** — UI pages scaffolded for the account experience

### What was removed

- Clerk (auth, organizations, billing) — replaced with a mock auth context stub
- Workspaces / Teams pages
- Kanban board
- Chat
- AI Chat streaming demo
- All non-Vercel themes (only the Vercel theme remains)

### Tech Stack

| Layer | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org/16) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org) |
| UI primitives | [shadcn/ui](https://ui.shadcn.com) on [Base UI](https://base-ui.com) |
| Styling | [Tailwind CSS v4](https://tailwindcss.com) |
| Icons | [@tabler/icons-react](https://tabler.io/icons) (single registry in `src/components/icons.tsx`) |
| Data fetching | [TanStack React Query](https://tanstack.com/query) |
| URL state | [Nuqs](https://nuqs.47ng.com/) |
| Tables | [TanStack Table](https://tanstack.com/table/latest) |
| Forms | [TanStack Form](https://tanstack.com/form) + [Zod](https://zod.dev) |
| Drag-and-drop | [@dnd-kit](https://dndkit.com) |
| State (local UI) | [Zustand](https://zustand-demo.pmnd.rs) |
| Charts | [Recharts](https://recharts.org) |
| Command+K | [kbar](https://kbar.vercel.app/) |
| Toasts | [React Hot Toast](https://react-hot-toast.com/) |
| Error tracking | [Sentry](https://sentry.io/for/nextjs/) (optional) |
| Linter / Formatter | [OxLint](https://oxc.rs/docs/guide/usage/linter) + [Oxfmt](https://oxc.rs/docs/guide/usage/formatter) |
| Pre-commit hooks | [Husky](https://typicode.github.io/husky/) |

## Architecture notes

### Auth (stub)

Authentication is intentionally a stub right now. `src/lib/auth-context.tsx` provides a `AuthProvider` with a mock user for development, and the real login/register flow targets a backend at `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000/api/v1`). Sign-in and sign-up pages render the form UI; the actual API calls are prepared but not connected to a live service.

If you want to connect a real auth backend, implement the endpoints the context already calls:
- `POST /auth/login`
- `POST /auth/register`
- `POST /auth/refresh`
- `POST /auth/logout`

JWT tokens are stored in `sessionStorage` during development, with an in-memory refresh flow. For production, move tokens to httpOnly cookies as appropriate for your stack.

### Data fetching pattern

Each feature follows the same three-file API layer:

```
src/features/<name>/api/
  types.ts      ← type contract
  service.ts    ← data access functions (mock by default; swap for your backend)
  queries.ts    ← React Query query key factory + queryOptions
```

The default pattern is TanStack's official SSR flow: server-side `prefetchQuery` + `HydrationBoundary` + `dehydrate`, then `useSuspenseQuery` on the client. Mutations invalidate the query cache on success.

### Fake data

Mock data lives in `src/constants/` and inside each feature's `api/service.ts`. When you connect a real backend, only `service.ts` needs to change — queries and components import from it and stay untouched.

### Theme

Only the **Vercel** theme remains. Dark/light mode toggle still works (default shortcut `⌘⇧D`). There is no theme switcher anymore.

## Project structure

```
src/
├── app/                          # Next.js App Router
│   ├── auth/                     # Sign-in / sign-up (UI stubs)
│   ├── dashboard/                # Dashboard route group
│   │   ├── overview/             # Cards + charts, parallel routes
│   │   ├── surveys/              # Survey list + per-survey lifecycle
│   │   │   └── [surveyId]/
│   │   │       ├── page.tsx              # Survey header + phase nav
│   │   │       ├── builder/              # Editor (sections, questions, AI panel)
│   │   │       ├── collect/              # Publish + share + live stats
│   │   │       ├── respondents/          # Response list + individual view
│   │   │       ├── analytics/            # Distributions, cross-tab, saved analyses
│   │   │       └── reports/              # Report view
│   │   ├── product/              # Product table (kept as a reference CRUD flow)
│   │   ├── react-query/          # React Query pattern demo
│   │   ├── forms/                # Basic / advanced / multi-step / sheet form demos
│   │   ├── plans/                # Plan detail page
│   │   ├── notifications/        # Notification center
│   │   ├── profile/              # Profile page (UI stub)
│   │   ├── settings/             # Settings page
│   │   ├── elements/             # UI element showcase
│   │   ├── ai-chat/              # (page removed; components remain if re-added)
│   │   └── billing/              # (page removed)
│   ├── api/                      # Route handlers (BFF / REST patterns)
│   ├── layout.tsx                # Root layout + providers
│   ├── page.tsx                  # Redirects to dashboard
│   ├── global-error.tsx          # Sentry-wired error boundary
│   └── not-found.tsx             # 404 page
│
├── components/
│   ├── ui/                       # shadcn/ui primitives
│   ├── layout/                   # Sidebar, header, org-switcher, user-nav
│   ├── themes/                   # Theme config, mode toggle, font config
│   ├── kbar/                     # Command+K bar
│   ├── icons.tsx                 # Centralized icon registry
│   └── ...
│
├── features/                     # Feature modules
│   ├── overview/                 # Dashboard analytics
│   ├── products/                 # Product CRUD (React Query demo)
│   ├── surveys/                  # Survey list + tables
│   ├── builder/                  # Survey builder (sections, questions, AI panel)
│   ├── collect/                  # Collection / publish flow
│   ├── respondents/              # Respondents list + detail
│   ├── analytics/                # Analytics queries + components
│   ├── notifications/            # Notification center + store
│   ├── auth/                     # Sign-in / sign-up view components
│   ├── profile/                  # Profile page components
│   └── react-query-demo/         # Pokemon API React Query demo
│
├── lib/                          # Query client, utils, auth-context, search params
├── hooks/                        # Custom hooks (nav, breadcrumbs, etc.)
├── config/                       # Nav config, infobar content
├── constants/                    # Mock data
├── styles/
│   ├── globals.css               # Tailwind + view transitions
│   └── themes/
│       └── vercel.css            # Only remaining theme
└── types/                        # Shared TypeScript types
```

## Getting started

### Prerequisites

- [Bun](https://bun.sh) (preferred) or npm
- Node.js 20+

### Run locally

```bash
git clone https://github.com/PAVILION/Survey-Copilot.git
cd Survey-Copilot/frontend
bun install
cp env.example.txt .env.local
bun run dev
```

The app runs at `http://localhost:3000`.

### Environment variables

Copy `env.example.txt` to `.env.local`. The file currently documents:

- `BUILD_STANDALONE` — set to `true` when deploying with Docker or self-hosting in standalone output mode
- Sentry variables (`NEXT_PUBLIC_SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_ORG`, `NEXT_PUBLIC_SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DISABLED`) — optional, only needed if you want error tracking
- `NEXT_PUBLIC_API_BASE_URL` — optional; the auth context falls back to `http://localhost:8000/api/v1` when unset

No Clerk variables are needed. Clerk was removed from the project.

### Connecting auth

The sign-in and sign-up pages are UI stubs. To make them functional, implement the backend endpoints the auth context expects (see the Auth stub section above) and point `NEXT_PUBLIC_API_BASE_URL` at your service.

### Connecting real data

For each feature, replace the mock implementations in `src/features/<name>/api/service.ts` with real fetches or server actions. Query keys and options in `queries.ts` do not need to change.

## Cleanup script

The repo still ships the optional cleanup script at `scripts/cleanup.js`, but many of the original features have already been removed. If you want to run it:

```bash
bun run cleanup --list
bun run cleanup --interactive
bun run cleanup --dry-run <feature>
```

When you are done cleaning up, delete `scripts/cleanup.js`, `scripts/cleanup-templates/`, and the `cleanup` entry in `package.json`.

## Deployment

Deploy to [Vercel](https://vercel.com) out of the box, or use the included Dockerfiles:

- `Dockerfile` — Node.js-based
- `Dockerfile.bun` — Bun-based

Both use Next.js standalone output mode. Full guide: `docs/deployment.md`.

When deploying, set `BUILD_STANDALONE=true` and any Sentry variables you want to enable.

## Support

If this saved you time, a star is appreciated.

## License

MIT.
