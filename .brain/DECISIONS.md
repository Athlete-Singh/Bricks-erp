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

**ADR-006 — Design tokens: TVAM green #0B6B3A + gold #E3A21A — 2026-10-07**
Decision: primary green scale, gold accent (sparingly), slate neutrals, bg #F8FAF9, separate semantic success (#16A34A family, cooler) vs brand green. Values in `docs/05-design-system.md`, `web/src/styles/tokens.css`, `mobile/lib/core/theme/app_colors.dart`.
Why: brand match from client PDFs; text on primary passes WCAG AA (white on #0B6B3A ≈ 6.6:1).

**ADR-007 — Commit Flutter generated code — 2026-10-07**
Decision: commit `*.g.dart` / `*.freezed.dart`. Why: fresh clone and AI sessions build without a codegen step failing. Alternative: generate in CI only.

**ADR-008 — One `parties` table with types — 2026-10-07**
Decision: customers, suppliers, Sardars, transporters, employees, others in one `parties` table with `party_types[]`; each party gets one ledger account. Why: one party can be both customer and supplier; single ledger statement. Alternative: table per type (as in Functional Spec §19 suggestion).

**ADR-009 — Money as strings over JSON — 2026-10-07**
Decision: API sends/receives money as decimal strings. Why: no float rounding in JS/Dart.
