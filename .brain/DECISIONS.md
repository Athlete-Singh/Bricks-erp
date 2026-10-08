# DECISIONS — ADR log (append-only)

Format: `ADR-NNN — title — date — decision — why — alternatives`

**ADR-001 — Monorepo with pnpm + Turborepo — 2026-10-07**
Decision: one repo; pnpm workspaces for backend, web, packages/*; Flutter in `mobile/` with its own tooling.
Why: shared types/Zod schemas, one CI, one brain. Alternatives: separate repos (drift between API and clients).

**ADR-002 — TanStack Query + Zustand, not Redux — 2026-10-07**
Decision: server state in TanStack Query; small UI state in Zustand.
Why: ~90% of ERP state is server data; Query gives caching/refetch/optimistic updates with less boilerplate. Alternatives: Redux Toolkit + RTK Query.

**ADR-003 — Two-level phase model — 2026-10-07**
Decision: Client Phases (CP1 MVP = SOW modules 1–12 basic depth; CP2 = advanced) vs internal one-session steps (P0.1…P13.3, A1…A7). Feature register in FEATURES.md.
Why: keep MVP lean as contracted; never leave a broken build between AI sessions.

**ADR-004 — Node 24 LTS — 2026-10-07**
Decision: Node 24 LTS (pinned `.nvmrc`, `engines >=24`). Why: Node 20 is end-of-life. Next.js 14 kept as fixed by SOW.

**ADR-005 — Tailwind CSS 3.4 with CSS-variable tokens — 2026-10-07**
Decision: Tailwind 3.4 + `hsl(var(--token))` colours, `class` dark mode. Why: proven with Next 14 and shadcn-style primitives. Alternatives: Tailwind 4 (fine later; migration is cheap).

**ADR-006 — Design tokens: deep green #0B6B3A + gold #E3A21A — 2026-10-07**
Decision: primary green scale, gold accent (sparingly), slate neutrals, bg #F8FAF9, separate semantic success (#16A34A family, cooler) vs brand green. Values in `docs/05-design-system.md`, `web/src/styles/tokens.css`, `mobile/lib/core/theme/app_colors.dart`.
Why: matches the palette in the client PDFs; text on primary passes WCAG AA (white on #0B6B3A ≈ 6.6:1).
_(Attribution corrected 2026-10-08: the palette comes from the brief. The decision itself is unchanged.)_

**ADR-007 — Commit Flutter generated code — 2026-10-07**
Decision: commit `*.g.dart` / `*.freezed.dart`. Why: fresh clone and AI sessions build without a codegen step failing. Alternative: generate in CI only.

**ADR-008 — One `parties` table with types — 2026-10-07**
Decision: customers, suppliers, Sardars, transporters, employees, others in one `parties` table with `party_types[]`; each party gets one ledger account. Why: one party can be both customer and supplier; single ledger statement. Alternative: table per type (as in Functional Spec §19 suggestion).

**ADR-009 — Money as strings over JSON — 2026-10-07**
Decision: API sends/receives money as decimal strings. Why: no float rounding in JS/Dart.

**ADR-010 — Backend stack versions: NestJS 11, TypeORM 0.3, TypeScript 5.9 — 2026-10-07**
Decision: NestJS 11 (CommonJS) + TypeORM 0.3.31 + TS ~5.9 + Jest 30 / ts-jest. Why: NestJS 12 is ESM-only (Jest ESM is experimental/fragile); ts-jest needs TS < 7; TS 6 changes defaults. Revisit (Nest 12, TypeORM 1, TS 6+) after CP1 — tech-debt item.

**ADR-011 — One env file per app — 2026-10-07**
Decision: `backend/.env`, `web/.env.local`, `mobile/env/dev.json` (each with a committed example). No root .env. Why: matches deployment (Render / Vercel / app build each own their variables); web never sees backend secrets.

**ADR-012 — pnpm build-script allow-list — 2026-10-07**
Decision: `allowBuilds` in `pnpm-workspace.yaml` — allow esbuild, @parcel/watcher, unrs-resolver; deny @scarf/scarf (telemetry). New packages with install scripts must be added explicitly.

**ADR-013 — Tenant scope comes from the JWT, never from the route — 2026-10-08**
Decision: no endpoint accepts a `company_id` from the client. Resources below a company (`/sites`, `/financial-years`, `/users`, `/audit-logs`) read it from the JWT; company-level routes (`/companies/:id`) assert membership through `MembershipService`; super admins bypass. `/companies/:cId/sites` and `/companies/:cId/financial-years` from P1.1 were removed.
Why: P1.1 shipped six endpoints that read `company_id` from the URL and never checked it, so any authenticated user could read and write another tenant's data. Putting the check in one service instead of each controller means a new module cannot forget it. Alternatives: validating the param in every controller (easy to miss); Postgres row-level security (heavier, and harder to test from the app side — revisit for CP2).

**ADR-014 — Zod at the edge instead of class-validator DTOs — 2026-10-08**
Decision: request bodies are validated by `ZodValidationPipe` against the schemas in `@brics/shared`; `AllExceptionsFilter` also maps a stray `ZodError` to 400. CONVENTIONS' "DTOs with class-validator" is superseded for request validation.
Why: the schemas already exist in `packages/shared` and are shared with the web forms (RHF + Zod), so one definition covers client and server and the types are inferred. P1.1 called `schema.parse()` inside handlers, which threw a raw `ZodError` and surfaced as a 500. Alternative: duplicate every schema as a class-validator DTO — two sources of truth for the same contract.

**ADR-015 — Refresh-token row id travels in the token — 2026-10-08**
Decision: the `refresh_tokens` row id is minted first and carried in the token's `jti`; refresh does one indexed lookup plus one bcrypt compare, checks `expires_at`, then rotates. Expiry is derived from `JWT_REFRESH_TTL`.
Why: P1.1 loaded every non-revoked token for the user and bcrypt-compared each one (~100ms apiece), so refresh latency grew with session count — a self-inflicted DoS. It also ignored `expires_at` and hardcoded 30 days. Alternative: store an unhashed lookup key (weaker if the table leaks).

**ADR-016 — Access token in memory, refresh token in localStorage — 2026-10-08**
Decision: the access token (15 min) lives only in a module variable, never in storage. The refresh token (30 days) is kept in `localStorage` under `brics_refresh`. On boot, if a refresh token exists the app calls `POST /auth/refresh` to get a fresh pair.
Why: the backend returns both tokens in the response body, so an httpOnly cookie is not available without changing the API. Keeping the short-lived token out of storage means an XSS payload has to stay resident to use it, rather than exfiltrating a token that works for 15 minutes. The refresh token is rotated on every use (ADR-015), so a stolen one is single-use and its theft is detectable. Cost: one extra `/auth/refresh` call on a hard page reload. Alternatives: both in localStorage (simpler, larger blast radius); httpOnly cookies (better, but needs the API to set cookies and a CSRF story — revisit for CP2).

**ADR-017 — The API client unwraps the envelope — 2026-10-08**
Decision: `apiClient.get<T>()` returns the `data` payload, not `{ data }`. Paginated endpoints use `apiClient.getPaged<T>()`, which returns `{ items, meta }`.
Why: every endpoint returns the envelope, so unwrapping once in the client keeps `.data.data` out of every hook and component. Decided now rather than after P1.2b/c wrote screens against the raw shape.
