# Survey Copilot

## Product
AI-assisted survey lifecycle platform (Plan → Build → Review → Collect → Analyze → Report) for M&E / CSO teams. Pilot partner: DICDO via Code for Africa.

## Audience
Researchers and program staff who need trustworthy survey workflows where AI never invents statistics.

## Brand commitments (session)
- Visual world: white ground, primary teal (`#103344`), secondary green (`#22f187`), black text, Geist + Bricolage Grotesque, pill nav, soft borders, board-list density (layout motifs from Launchpot).
- Surfaces: landing, auth, dashboard, and public collect share the same token set.

## Assumptions
- Frontend-only for now; mock board data is fine.
- Dashboard routes remain at `/dashboard/*` until the theme is rolled through the app.

## Frontend stack (canonical)
- **shadcn/ui** — UI primitives
- **Auth security** — JWT + httpOnly cookies (API is source of truth)
- **Better Auth** — frontend auth UX / client helpers only (not a second backend)
- **TanStack Query** — server/async state
- **React Hook Form + Zod** — forms and validation
- **Zustand** — client UI state

Do not expand Clerk, TanStack Form, or alternate UI/data libraries. Do not put access tokens in localStorage.
