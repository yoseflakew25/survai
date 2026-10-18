# CLAUDE.md

SurvAI frontend — Next.js 16 + shadcn/ui.

## Canonical stack

| Concern | Use |
| --- | --- |
| UI | shadcn/ui |
| Auth security | JWT + httpOnly cookies (API) |
| Auth FE UX | Better Auth (UI/helpers only) |
| Data fetching | TanStack Query |
| Forms | React Hook Form + Zod |
| Client state | Zustand |

Do not introduce Clerk, TanStack Form, SWR, or alternate UI kits for new work.

## Key References

- **[AGENTS.md](./AGENTS.md)** — Full project overview, structure, conventions, data fetching
- **[docs/themes.md](./docs/themes.md)** — Theme system
- **[docs/nav-rbac.md](./docs/nav-rbac.md)** — Navigation RBAC (migrate away from Clerk assumptions)
- **[docs/deployment.md](./docs/deployment.md)** — Deployment
- **[docs/forms.md](./docs/forms.md)** — React Hook Form + Zod
- **[docs/clerk_setup.md](./docs/clerk_setup.md)** — Legacy; ignore (auth = JWT+cookies + Better Auth FE UX)

## Critical Conventions

- **React Query** for all data fetching — `void prefetchQuery()` on server + `useSuspenseQuery` on client, `useMutation` for writes, `HydrationBoundary` + `dehydrate` for hydration
- **API layer** per feature — `api/types.ts` → `api/service.ts` → `api/queries.ts`; components import from service and queries, never from mock APIs directly
- **nuqs** for URL search params — `searchParamsCache` on server, `useQueryStates` on client
- **Icons** — only import from `@/components/icons`, never from `@tabler/icons-react` directly
- **Forms** — React Hook Form + Zod (`useForm` + `FormProvider` + `zodResolver` + `@/components/forms/fields`)
- **Page headers** — use `PageContainer` props (`pageTitle`, `pageDescription`, `pageHeaderAction`), never import `<Heading>` manually
- **Formatting** — single quotes, JSX single quotes, no trailing comma, 2-space indent
