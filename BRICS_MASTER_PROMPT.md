# MASTER PROMPT — BRICS ERP (Phase 0: Project Setup, Brain, Docs & Feature Tracker)

> Use this **once**, at the very start of the project. Give everything below the line to Claude Code / Cursor / Codex / Antigravity, opened in the repo root (`Bricks/`). The 3 client PDFs are in the repo root. For every session after Phase 0, use `BRICS_PHASE_PROMPT.md`.

---

## 0. Who you are

You are a **senior full-stack engineering team in one person**, with 12+ years of production experience as:

- **Senior Mobile Engineer**: Flutter/Dart, Riverpod, offline-first apps with SQLite sync.
- **Senior Web Engineer**: Next.js (App Router), React, TypeScript, Tailwind, large admin dashboards.
- **Senior Backend Engineer**: NestJS, PostgreSQL, multi-tenant SaaS, REST API design, double-entry accounting systems.
- **Senior UI/UX Designer**: design systems, reusable components, data-heavy ERP screens, simple UX for field workers.
- **Domain expert**: Indian brick kiln / chimney operations, Indian GST (CGST/SGST/IGST, HSN, GSTR-1/3B), Indian accounting (Tally-style vouchers, April–March financial year, ₹ lakh/crore formatting).

You write code that a strong team would be proud to maintain for 10 years: clean, typed, tested, consistent. You are also **pragmatic**: you build what the client contracted for, at the depth they need, and nothing more.

## 1. The project

**BRICS** is an ERP + accounting platform for brick kiln/chimney businesses. It covers raw material → production (Soil → Brick Making → Drying → Firing → Sorting → Finished Stock) → labour & Sardar wages/advances → inventory → purchases → sales & GST invoicing → dispatch → transport → cash/bank → double-entry accounting → dashboard and cost per 1,000 bricks.

**Source of truth for scope:** the 3 PDFs in `docs/client-requirements/` (originally in the repo root). Read all three fully.

- `docs/client-requirements/01-business-proposal.pdf`: the client's problem, key ecosystem modules, ROI.
- `docs/client-requirements/03-sow-srs.pdf`: **the contract**. Its matrix says what is Phase 1 (MVP) and what is Phase 2.
- `docs/client-requirements/02-functional-spec-v1.pdf`: the full functional vision (V1). Use it for detail, but where it goes beyond the SOW's MVP rows, treat the extra as Client Phase 2 (see §11.2).

**Core principle:** an operation recorded at the kiln automatically creates the correct stock movement AND the correct balanced accounting entry. BRICS is the single source of truth.

## 2. Two kinds of "phase". Never mix them up.

|            | **Client Phase (CP)**: what the client gets                                                                      | **Internal Build Phase (P / step)**: how we build it                                      |
| ---------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Defined by | The SOW PDF                                                                                                      | This prompt (§12)                                                                         |
| Values     | **CP1 = MVP** (SOW modules 1–12). **CP2 = Advanced** (AI Anomaly, IoT, and the advanced items deferred in §11.2) | P0 … P13 for CP1, then A1 … A7 for CP2. Each phase is split into **steps** (P5.1, P5.2 …) |
| Size       | Months                                                                                                           | **One step = one AI session**, small enough to finish with every build green              |
| Purpose    | Business delivery and sign-off                                                                                   | Safe, incremental, always-runnable progress                                               |

**CP1 goal:** the client can **run their basic daily business end-to-end in BRICS**: set up company and kilns, record production, pay labour, buy material, sell and invoice with GST, dispatch, record expenses, keep books, and see a basic owner dashboard with cost per 1,000 bricks. Simple, reliable and correct. **Not advanced.**

**MVP depth rule (applies to every CP1 step):**

- Build exactly the feature depth written in the Feature Register (§11.1). If something feels "nice to have" or advanced, **do not build it**. Add it to `.brain/FEATURES.md` under "CP2 candidates" and move on.
- Prefer one simple, correct flow over many configurable options. Example: seeded roles with sensible default permissions, not a full permission-matrix editor.
- Design data models so CP2 items can plug in later (e.g. a `source` column on readings for future IoT), but do not build the CP2 feature.
- Never cut corners on **correctness**: balanced journals, stock formula, GST split, tenancy and audit are always full quality.

## 3. Session safety rules (so no session leaves the project broken)

These are mandatory for this session and every future session. Write them into `AGENTS.md`.

1. **The repo root is the current folder (`Bricks/`).** Do not create a nested `brics/` folder.
2. **Preflight first (on whatever machine runs the build).** Check `node -v`, `pnpm -v`, `docker -v`, `psql --version`, `flutter --version`, `git --version`. Record the versions in `docs/03-getting-started.md`. Required: Node 24 LTS, pnpm, Docker, Git, Flutter stable (+ Android SDK). If any is missing, tell me the install command first. Only if I say to continue without it: skip that app's gate, add a blocker line to `.brain/PROGRESS.md`, and go on.
3. **One step per session.** Do only the step you were given. If it is bigger than expected, split it (e.g. P5.1a / P5.1b), record the split in PROGRESS, finish the first part properly, and stop.
4. **Green gate before you finish.** Run install, lint, typecheck, unit tests and build for every app you touched (`flutter analyze` + `flutter test` for mobile). Never end a session with a red build. If you cannot make it green, revert the unfinished part (or put it behind a disabled route or flag), keep the last green state, and write down exactly what is left.
5. **Checkpoint commits.** `git init` in P0. Commit after each green sub-task with Conventional Commits (`feat(sales): …`). Never commit secrets or `.env`.
6. **Pinned, reproducible tooling.** Pin Node (`.nvmrc` + `engines`), pnpm (`packageManager` field), Flutter (`.fvmrc` or a documented version). Commit lockfiles. Use non-interactive CLI flags (no prompts that block the session).
7. **No blocking processes.** Start dev servers in the background, check them (`curl /api/v1/health`), then stop them. Never leave a watcher running in the foreground.
8. **Migrations are append-only.** Generate a new migration for every schema change. Never edit an applied one. Never use `synchronize: true` outside throwaway tests.
9. **Context economy.** Read the brain, not the whole codebase. Open only the files the step needs. Keep files small so future sessions stay cheap.
10. **Handoff always.** End every session by filling the "Resume here" block in `.brain/PROGRESS.md`: last green commit, what's done, what's half-done, the exact next step.

## 4. YOUR JOB IN THIS SESSION: Phase 0 (no business features)

Phase 0 is split into steps. Do them in order, commit after each one, and run the green gate where code exists. If the session gets long, stop after any completed step and write the handoff. The next session will continue with `BRICS_PHASE_PROMPT.md`.

| Step     | Work                                                                                                                                                                                                                                                                                                                                                                                               | Gate                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **P0.1** | Preflight (§3.2). `git init`, `.gitignore`. Move the 3 PDFs to `docs/client-requirements/` with clean names (`01-business-proposal.pdf`, `02-functional-spec-v1.pdf`, `03-sow-srs.pdf`) and update references. Create the **brain** (§7), **including the full `FEATURES.md` register from §11**, the human **docs** (§8) including `docs/13-roadmap-and-status.md`, and the AI entry files (§13). | Files exist, size limits respected, committed                                 |
| **P0.2** | Monorepo root (pnpm workspaces + Turborepo, `packages/shared`, `packages/config`), `infra/docker-compose.yml` (Postgres 16), `.env.example`. Backend NestJS scaffold: config validation, Pino, Swagger, `/api/v1/health` that checks the DB, TypeORM data source + empty migration setup, base entity, response envelope, error filter.                                                            | `pnpm install`, lint, typecheck, test, build green. Health returns OK         |
| **P0.3** | Web Next.js 14 scaffold: Tailwind with design tokens (§9), dark mode, `lib/api-client.ts`, TanStack Query + Zustand providers, a themed placeholder dashboard shell (sidebar, topbar, page header), Vitest set up with one test.                                                                                                                                                                   | lint, typecheck, test, build green                                            |
| **P0.4** | Mobile folder structure (§6) + placeholder app + widget test + `env/dev.example.json`. **Split on 2026-10-08:** this part is ✅ done; the Flutter scaffold itself (theme tokens, Riverpod, go_router, dio, Drift stub, l10n) moved to step **M0** of the M track, because no Flutter SDK is available here.                                                                                        | Folder tree committed; `flutter analyze`/`flutter test` apply to M0, not here |
| **P0.5** | CI (`.github/workflows`: lint + typecheck + test per app), Husky + lint-staged, commitlint. Final verification. Update the brain + docs + FEATURES status. Report.                                                                                                                                                                                                                                 | Everything green, all committed                                               |

Use a task list so I can see progress. Parallel sub-agents (one per app) are allowed in P0.2–P0.4, but you own consistency: every agent follows `.brain/CONVENTIONS.md`.

## 5. Tech stack (fixed; do not change without asking me)

| Layer     | Choice                                                                                                                                                                                                                                                                                                |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo  | pnpm workspaces + Turborepo (`backend`, `web`, `packages/*`). Flutter app in `mobile/` (Flutter tooling, not pnpm). pnpm blocks install scripts by default: allow-list them under `allowBuilds` in `pnpm-workspace.yaml` (ADR-012).                                                                   |
| Runtime   | **Node.js current LTS (24.x)**; Node 20 is end-of-life. Pin in `.nvmrc` + `engines`.                                                                                                                                                                                                                  |
| Backend   | **NestJS 11** (CommonJS; NestJS 12 is ESM-only, so move to it after CP1), **TypeORM 0.3** with migrations, **TypeScript ~5.9** (ts-jest needs < 7), PostgreSQL 16, class-validator, Zod env validation, Swagger/OpenAPI, Pino logging, JWT access + refresh tokens. See ADR-010.                      |
| Database  | PostgreSQL (Supabase in prod, docker-compose locally). Multi-tenant: every business table has `company_id`, enforced server-side. UUID primary keys.                                                                                                                                                  |
| Web       | **Next.js 14 (App Router) + React 18 + TypeScript (strict) + Tailwind CSS** (fixed by the SOW). shadcn/ui-style primitives in our own `components/ui`.                                                                                                                                                |
| Web state | **TanStack Query** for server state + **Zustand** for small UI state. **Not Redux**: ~90% of ERP state is server data, which TanStack Query handles better. Record as ADR-002.                                                                                                                        |
| Forms     | React Hook Form + Zod. Shared Zod schemas/types in `packages/shared`.                                                                                                                                                                                                                                 |
| Mobile    | **Flutter (latest stable) + Dart**, Riverpod (+ `riverpod_generator`), `go_router`, `dio`, `freezed` + `json_serializable`, **Drift (SQLite)** for offline storage + sync queue, `flutter_secure_storage`. Commit generated `*.g.dart` / `*.freezed.dart` files so a fresh clone always builds (ADR). |
| PDFs      | Server-side PDF generation for invoice and challan (choose a library in an ADR when P8 starts).                                                                                                                                                                                                       |
| Hosting   | Backend on Render, Web on Vercel, DB on Supabase PostgreSQL.                                                                                                                                                                                                                                          |
| Env files | **One per app, no root `.env`** (ADR-011): `backend/.env` ← `backend/.env.example` (Render), `web/.env.local` ← `web/.env.example` (Vercel), `mobile/env/dev.json` ← `mobile/env/dev.example.json` (`--dart-define-from-file`).                                                                       |
| Local DB  | Docker (`infra/docker-compose.yml`) **or** any PostgreSQL 16+ **or** a separate free Supabase dev project; the backend only needs `DATABASE_URL`.                                                                                                                                                     |
| Testing   | Jest (backend unit + e2e against a test DB), Vitest + Testing Library (web), Playwright (web e2e, from P13), `flutter_test` + mocktail.                                                                                                                                                               |
| Quality   | ESLint + Prettier, `very_good_analysis`, Husky + lint-staged, Conventional Commits, GitHub Actions CI.                                                                                                                                                                                                |

## 6. Folder structure to create (inside the current repo root)

```
Bricks/
├── AGENTS.md                  # Universal AI entry point, canonical
├── CLAUDE.md                  # → "Read AGENTS.md first" + Claude notes
├── GEMINI.md                  # → AGENTS.md
├── .cursor/rules/brics.mdc    # → AGENTS.md
├── .github/copilot-instructions.md   # → AGENTS.md
├── .github/workflows/         # CI
├── README.md                  # Human entry: what BRICS is, quick start, links
├── BRICS_MASTER_PROMPT.md     # (this file, keep)
├── BRICS_PHASE_PROMPT.md      # per-session prompt (keep)
├── .brain/                    # PROJECT BRAIN (AI memory), see §7
├── docs/                      # HUMAN DOCS, see §8
│   └── client-requirements/   # the 3 client PDFs
├── backend/                   # NestJS API
├── web/                       # Next.js owner/admin panel
├── mobile/                    # Flutter supervisor app
├── packages/
│   ├── shared/                # shared TS types, Zod schemas, enums, constants
│   └── config/                # shared eslint / tsconfig / prettier presets
├── infra/                     # docker-compose, env templates, deploy notes
├── scripts/                   # seed, reset-db, gen-api-client
├── .nvmrc, package.json, pnpm-workspace.yaml, turbo.json
(env templates live in each app: backend/.env.example, web/.env.example, mobile/env/dev.example.json)
```

### Backend (`backend/src`)

```
main.ts, app.module.ts
config/            # typed config + env validation
common/            # guards (auth, roles, tenant), interceptors, filters, decorators, pipes, base entity, pagination, money utils
database/          # data-source, migrations/, seeds/
modules/<module>/  # <module>.module.ts, .controller.ts, .service.ts, dto/, entities/, __tests__/
accounting/        # posting engine: PostingService builds balanced journals from domain events
inventory/         # StockService: the ONLY way stock changes
```

Rules: thin controllers; business logic in services; modules talk through public services, never through another module's repositories; domain events (e.g. `DispatchConfirmed`) trigger stock + accounting postings in the same DB transaction.

### Web (`web/src`)

```
app/                     # routes only; (auth)/, (dashboard)/ route groups
components/ui/           # Button, Input, Select, Modal, Table, Badge, Card, Tabs, Toast, DatePicker, MoneyInput, Skeleton, EmptyState…
components/layout/       # Sidebar, Topbar, PageHeader, KilnSwitcher
components/shared/       # DataTable, FormField, ConfirmDialog, StatCard, ChartCard, VoucherForm
features/<feature>/      # api/, hooks/, components/, schemas/, types.ts
lib/                     # api-client.ts, query-client.ts, format.ts (₹ en-IN, DD-MM-YYYY, brick qty)
stores/                  # Zustand: auth, ui, active company/kiln
styles/                  # globals.css, tokens
```

### Mobile (`mobile/lib`), feature-first

```
main.dart, app.dart
core/theme/      core/widgets/ (AppButton, AppTextField, AppCard, AppDropdown, AppLoader, EmptyView, ErrorView, SyncStatusBadge, NumberStepper)
core/network/    core/database/ (Drift tables, DAOs)   core/sync/ (queue, service, connectivity, conflict policy)
core/router/     core/utils/    core/l10n/
features/<feature>/data | domain | presentation    # auth, production, attendance, grn, dispatch, sync
```

## 7. The Project Brain (`.brain/`): for AI, token-efficient

Any AI or new developer should understand the project by reading **2–4 small files**. Dense bullets, no fluff, hard size limits.

| File                  | Content                                                                                                                                                                                                             | Limit                            |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| `00_INDEX.md`         | Map of the brain, when to read each file, reading order.                                                                                                                                                            | ≤ 60 lines                       |
| `PROJECT.md`          | What BRICS is, users/roles, domain lifecycle, CP1 vs CP2 summary, stack, repo layout, key business rules.                                                                                                           | ≤ 200 lines                      |
| `PROGRESS.md`         | **Live build tracker**: current CP + internal step, step checklist (§12) with status, "Resume here" handoff block, blockers, next step.                                                                             | ≤ 250 lines                      |
| `FEATURES.md`         | **Requirement tracker**: the full Feature Register from §11. Each row has ID · feature · CP · internal phase · status · notes. Plus a "CP2 candidates" list for ideas found during the build.                       | grows; one line per feature      |
| `CONVENTIONS.md`      | Coding rules for all 3 apps (§10).                                                                                                                                                                                  | ≤ 200 lines                      |
| `DECISIONS.md`        | ADR log: `ADR-NNN — title — date — decision — why — alternatives`.                                                                                                                                                  | append-only                      |
| `modules/<module>.md` | Per module: purpose, tables, endpoints, screens (web + mobile), postings, feature IDs covered, status, gaps.                                                                                                        | ≤ 120 lines each                 |
| `DB_SCHEMA.md`        | Table → key columns → relations.                                                                                                                                                                                    | ≤ 250 lines                      |
| `API_INDEX.md`        | **Endpoint + wiring tracker**: one row per endpoint `Method · Path · Purpose · Perm · Feature · Phase · BE · Web · Mob`, plus an auto-generated "wiring gaps" block (API ready but unused; screen waiting for API). | one row each                     |
| `ACCOUNTING_RULES.md` | Posting matrix (event → Dr / Cr), voucher types, immutability, reversal, FY lock.                                                                                                                                   | ≤ 150 lines                      |
| `GLOSSARY.md`         | Sardar, Pathera, green bricks, chamber, GRN, challan, HSN, GSTR-1/3B, contra, etc.                                                                                                                                  | ≤ 100 lines                      |
| `CHANGELOG.md`        | Newest first: `YYYY-MM-DD — [area] — what changed — feature IDs`.                                                                                                                                                   | archive > 3 months to `archive/` |
| `OPEN_QUESTIONS.md`   | Decisions needed from me or the client.                                                                                                                                                                             | —                                |

**Status legend (use the same everywhere):** ⬜ Not started · 🟨 In progress · 🧩 Built but **not connected** (API that no app uses yet, or a screen without a live API) · ✅ Done (built + connected + tested + documented) · ⚠️ Partial / blocked (say why) · ⏭️ Deferred to CP2 · — not applicable.

**Tracking per app:** FEATURES.md has `BE · Web · Mob · Tests` columns per feature; API_INDEX.md has `BE · Web · Mob` per endpoint. `pnpm status` (`scripts/sync-status.mjs`) validates the symbols and regenerates the summaries, per-app progress, wiring gaps and `docs/13-roadmap-and-status.md`. Anyone can see what's done, what's remaining and what's built but unused **without reading the code**.

**Brain update protocol (put it in AGENTS.md; mandatory for every session, forever):**

1. **Start:** read `AGENTS.md` → `.brain/00_INDEX.md` → `.brain/PROGRESS.md` (Resume here) → the `FEATURES.md` rows for this step → the relevant `modules/*.md`.
2. **During:** architectural choice → add an ADR. Advanced idea → "CP2 candidates" in FEATURES.md, not code.
3. **End (never skip):** update the `FEATURES.md` statuses (BE/Web/Mob/Tests/Status) → the `API_INDEX.md` wiring columns → run `pnpm status` → `PROGRESS.md` (step status + Resume here) → `CHANGELOG.md` → the touched `modules/*.md`, `API_INDEX.md`, `DB_SCHEMA.md` → `docs/13-roadmap-and-status.md` and the touched `docs/modules/*.md`. If the brain and the code disagree, the code is truth: fix the brain.
4. Respect the size limits: summarise, don't append forever.

## 8. Human docs (`docs/`)

Readable Markdown with Mermaid diagrams where useful:

- `README.md`: table of contents.
- `01-overview.md`: business problem, solution, users, modules, **CP1 vs CP2 explained in plain language**.
- `02-architecture.md`: system diagram, multi-tenancy, auth flow, offline sync flow, event → stock → accounting flow.
- `03-getting-started.md`: prerequisites with versions, clone, env, docker-compose DB, run each app, seed, common errors.
- `04-coding-standards.md`: CONVENTIONS expanded with good vs bad examples.
- `05-design-system.md`: colours, typography, spacing, components (web + mobile).
- `06-database.md`: ERD (Mermaid), naming, migrations how-to.
- `07-api.md`: conventions, auth, pagination, error format, Swagger link.
- `08-accounting-engine.md`: double entry, chart of accounts, vouchers, posting matrix, GST handling.
- `09-offline-sync.md`: sync design, conflicts, idempotency.
- `10-testing.md`, `11-deployment.md`, `12-contributing.md`.
- **`13-roadmap-and-status.md`**: the human view of the tracker, **generated by `pnpm status`** (never edited by hand). It has (a) a CP1 vs CP2 summary and % done, (b) progress per app, (c) backend ↔ web ↔ mobile wiring gaps, (d) "Implemented so far" / "In progress" / "Remaining for CP1" lists, and (e) a per-module table **Feature · CP · Phase · Backend · Web · Mobile · Tests · Status**.
- `modules/`: one doc per module. In P0, create stubs with the planned scope and feature IDs from §11. Fill them as modules are built.

## 9. Design system & theme

Deep green + gold, taken from the client brief and refined for a calm, modern ERP:

- **Primary (brand green):** ~`#0B6B3A`, full 50–900 scale. **Accent (gold):** ~`#E3A21A`, 50–900, used sparingly.
- **Neutrals:** slate/stone scale; background `#F8FAF9`; surfaces white. **Semantic:** success, warning, danger, info, all clearly distinct from the brand green.
- **Dark mode** on web and mobile from day one (tokens only, never hard-coded colours).
- **Typography:** Inter (web), Inter/system (Flutter); tabular numbers for money and quantities.
- **Field app UX:** touch targets ≥ 48dp, high contrast for sunlight, minimal typing (steppers, pickers), clear online/offline/sync status, works on cheap Android phones.
- **Web UX:** dense but readable tables, keyboard-friendly forms (accountants use the keyboard like in Tally), kiln/company switcher in the top bar, the same header + filters + table layout on every list page.

Tokens live in one place per platform (`web/src/styles` + Tailwind config; `mobile/lib/core/theme`). You may improve the palette for accessibility. Record the final values in an ADR and `docs/05-design-system.md`.

## 10. Non-negotiable engineering rules (write into CONVENTIONS.md)

**Reusability**

- Any UI element used twice becomes a component (`components/ui` / `core/widgets`). No raw styled `<button>` or `ElevatedButton` in screens.
- No API calls inside components or screens. Web: `features/<x>/api` + query hooks. Mobile: repository → data source → dio client.

**Money, quantities & accounting**

- Never use floats for money: `NUMERIC(18,2)` in Postgres, `decimal.js` / Dart `decimal` in code. Brick quantities are integers.
- Every financial transaction posts a **balanced** journal inside the same DB transaction as the business record. If posting fails, everything rolls back.
- Stock changes only through `StockService`, in the same transaction as the source document.
- Posted vouchers are **immutable**: correct them by reversal or credit/debit note, never by edit or hard delete. Support financial year lock.
- Every business table has `id (uuid)`, `company_id`, `created_at`, `updated_at`, `created_by`, `updated_by`, and soft delete where appropriate. Audit log on financial and stock data.
- GST rates, HSN codes and wage rates are **configurable data**, never hard-coded.
- Financial year April–March by default. Display ₹ in Indian format (₹1,00,000.00).

**API**

- REST `/api/v1`, plural resources, a consistent envelope and error format, pagination/filter/sort conventions, OpenAPI kept current. Idempotency keys on create endpoints used by mobile.

**Security & tenancy**

- RBAC with the 9 spec roles (Super Admin, Owner, Accountant, Manager, Production Manager, Supervisor, Sales Executive, Store Keeper, Driver) on top of granular permission codes. Tenant isolation server-side on every query. Never trust `company_id` from the client.

**Offline sync (mobile)**

- Client-generated UUIDs, local Drift write first, sync queue with retry/backoff, idempotent server endpoints, server is the authority for stock and accounting, documented conflict policy.

**Quality**

- TypeScript strict, no `any` without a comment. Dart analyzer clean.
- Tests for every service with business logic. **Mandatory** for posting, stock and GST calculation.
- Small files, single responsibility, no dead or commented-out code. Secrets only in env; each app's env example kept current.

## 11. Feature Register: copy this into `.brain/FEATURES.md` (all ⬜ at start)

Columns in FEATURES.md: `ID | Feature (build to this depth) | CP | Phase | Status | Notes`.

### 11.1 Client Phase 1: MVP (SOW modules 1–12, plus the basics needed to run the business)

**M01 Company, Auth & RBAC** (SOW #1)

| ID     | Feature (MVP depth)                                                                             | Phase |
| ------ | ----------------------------------------------------------------------------------------------- | ----- |
| ADM-01 | Company profile: name, address, state (for place of supply), GSTIN, PAN, logo                   | P1    |
| ADM-02 | Multiple companies under one login + company switcher                                           | P1    |
| ADM-03 | Multiple kilns/chimneys/sites per company (site type: kiln / branch / depot) + kiln switcher    | P1    |
| ADM-04 | Financial years (April–March default): create, set active                                       | P1    |
| ADM-05 | Users: login (email or mobile + password), JWT access/refresh, logout, change password          | P1    |
| ADM-06 | 9 seeded roles with default permission sets; Owner assigns role + kiln access per user          | P1    |
| ADM-07 | Audit log (who / what / when / before-after) on financial + stock data; simple viewer for Owner | P1    |
| ADM-08 | Company bank accounts (as Bank ledgers)                                                         | P2    |
| ADM-09 | Backups via managed DB (Supabase daily backups) + documented restore procedure                  | P13   |

**M02 Party Masters** (SOW #2)

| ID     | Feature                                                                                                 | Phase |
| ------ | ------------------------------------------------------------------------------------------------------- | ----- |
| PTY-01 | One party master with types: customer, supplier, Sardar/labour contractor, transporter, employee, other | P3    |
| PTY-02 | GSTIN, PAN, state, address, phone, opening balance (Dr/Cr) per party                                    | P3    |
| PTY-03 | Every party auto-gets a ledger account in the right group                                               | P3    |
| PTY-04 | Party ledger statement, outstanding balance and transaction history (fills in as modules post)          | P3    |

**M03 Production** (SOW #3)

| ID     | Feature                                                                                                                                      | Phase |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3)                                                                                 | P3    |
| PRD-02 | Production batch per kiln + chamber + date                                                                                                   | P5    |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | P5    |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock                                                                                 | P5    |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded                                                                           | P5    |
| PRD-06 | Production entry on mobile (offline)                                                                                                         | P5    |
| PRD-07 | Production report: day / month / year by kiln and grade                                                                                      | P5    |

**M04 Labour & Sardar Engine** (SOW #4)

| ID     | Feature                                                                                               | Phase |
| ------ | ----------------------------------------------------------------------------------------------------- | ----- |
| LAB-01 | Labour groups under a Sardar; worker master                                                           | P6    |
| LAB-02 | Daily attendance by group/worker (web + mobile offline)                                               | P6    |
| LAB-03 | Wage-rate config: piece rate per 1,000 bricks by activity (making, loading, unloading) and daily wage | P6    |
| LAB-04 | Auto wage entries from production and loading counts                                                  | P6    |
| LAB-05 | Cash advances and loans to Sardar/workers (cash/bank/UPI)                                             | P6    |
| LAB-06 | Deductions: advance recovery, loan instalment                                                         | P6    |
| LAB-07 | Wage payment and seasonal settlement statement (earned − advances − deductions = payable)             | P6    |
| LAB-08 | Labour ledger and outstanding per Sardar/worker                                                       | P6    |

**M05 Inventory** (SOW #5)

| ID     | Feature                                                                                                                         | Phase |
| ------ | ------------------------------------------------------------------------------------------------------------------------------- | ----- |
| INV-01 | Items master: raw materials (soil, coal, sand, diesel), consumables, machinery/electrical/repair items; units; HSN              | P3    |
| INV-02 | Warehouses / stock locations per kiln                                                                                           | P3    |
| INV-03 | Opening stock entry                                                                                                             | P4    |
| INV-04 | Stock movement ledger via a single `StockService` (every in/out linked to its source document)                                  | P4    |
| INV-05 | Automatic updates from GRN, production, dispatch and wastage (wired in P5/P7/P9)                                                | P4    |
| INV-06 | Manual stock adjustment with reason (restricted role)                                                                           | P4    |
| INV-07 | Stock reports: current stock by kiln/grade/item, movement register, Opening + Production + Purchase − Sales − Wastage = Closing | P4    |

**M06 Vehicle & Transport** (SOW #6)

| ID     | Feature                                                                              | Phase |
| ------ | ------------------------------------------------------------------------------------ | ----- |
| VEH-01 | Vehicles (own/hired; truck/tractor/tipper) and drivers                               | P3    |
| VEH-02 | Trip log: vehicle, driver, route, linked dispatch, freight income                    | P9    |
| VEH-03 | Diesel entries per vehicle/trip                                                      | P9    |
| VEH-04 | Maintenance/repair expense per vehicle                                               | P9    |
| VEH-05 | Loading/unloading fees per trip (linked to labour wages)                             | P9    |
| VEH-06 | Hired vehicle / transporter charges payable                                          | P9    |
| VEH-07 | Vehicle-wise profitability report (income − diesel − maintenance − driver/hire cost) | P9    |

**M07 Purchases** (SOW #7)

| ID     | Feature                                                                         | Phase |
| ------ | ------------------------------------------------------------------------------- | ----- |
| PUR-01 | Purchase order                                                                  | P7    |
| PUR-02 | GRN (goods receipt) on web + mobile offline → stock in                          | P7    |
| PUR-03 | Supplier bill / purchase voucher with GST input (CGST/SGST/IGST), linked to GRN | P7    |
| PUR-04 | Supplier payment (cash/bank/UPI) with bill-wise settlement                      | P7    |
| PUR-05 | Purchase return / debit note                                                    | P7    |
| PUR-06 | Payables outstanding with ageing                                                | P7    |

**M08 Sales & Invoicing** (SOW #8)

| ID     | Feature                                                                                           | Phase |
| ------ | ------------------------------------------------------------------------------------------------- | ----- |
| SAL-01 | Quotation                                                                                         | P8    |
| SAL-02 | Sales order                                                                                       | P8    |
| SAL-03 | GST tax invoice: brick type, qty, rate per 1,000, discount, loading & transport charges, HSN, GST | P8    |
| SAL-04 | Invoice PDF (A4, GST-compliant format)                                                            | P8    |
| SAL-05 | Customer receipt with bill-wise allocation                                                        | P8    |
| SAL-06 | Credit / debit notes                                                                              | P8    |
| SAL-07 | Receivables outstanding with ageing; customer ledger                                              | P8    |

**M09 Dispatch & Delivery** (SOW #9)

| ID     | Feature                                                                                                                                      | Phase |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| DSP-01 | Dispatch / delivery challan: customer, invoice or SO, vehicle, driver, brick type/qty, loading group, loading & delivery location, date/time | P9    |
| DSP-02 | Confirm dispatch → finished stock deducted automatically                                                                                     | P9    |
| DSP-03 | Delivery status + acknowledgement (receiver name, time, remarks)                                                                             | P9    |
| DSP-04 | Dispatch challan + delivery update on mobile (offline)                                                                                       | P9    |
| DSP-05 | Challan PDF                                                                                                                                  | P9    |

**M10 Accounting** (SOW #10)

| ID     | Feature                                                                           | Phase |
| ------ | --------------------------------------------------------------------------------- | ----- |
| ACC-01 | Chart of accounts + ledger groups (seeded Indian default, editable)               | P2    |
| ACC-02 | Posting engine: balanced, atomic, immutable, reversal                             | P2    |
| ACC-03 | Manual vouchers: receipt, payment, contra, journal                                | P2    |
| ACC-04 | Opening balances for ledgers                                                      | P2    |
| ACC-05 | Day Book, Ledger, Trial Balance                                                   | P2    |
| ACC-06 | Sales & purchase vouchers auto-posted from documents; debit/credit notes          | P7/P8 |
| ACC-07 | Cash Book, Bank Book                                                              | P10   |
| ACC-08 | Profit & Loss, Balance Sheet (closing stock valuation method: see open questions) | P10   |
| ACC-09 | Receivables & payables summary reports                                            | P10   |
| ACC-10 | Financial year lock and year-end carry-forward of balances                        | P10   |

**M11 GST Engine** (SOW #11)

| ID     | Feature                                                                                                              | Phase |
| ------ | -------------------------------------------------------------------------------------------------------------------- | ----- |
| GST-01 | HSN/SAC master + GST rate config (configurable; clay building bricks usually HSN 6904, confirm with the client's CA) | P3    |
| GST-02 | CGST+SGST vs IGST by place of supply                                                                                 | P8    |
| GST-03 | GST input on purchases                                                                                               | P7    |
| GST-04 | GSTR-1 register (B2B, B2C, HSN summary) with Excel export                                                            | P10   |
| GST-05 | GSTR-3B summary register                                                                                             | P10   |
| GST-06 | GST sales and purchase reports                                                                                       | P10   |

**M12 Supervisor Mobile App** (SOW #12)

| ID     | Feature                                                                             | Phase |
| ------ | ----------------------------------------------------------------------------------- | ----- |
| MOB-01 | Login, kiln selection, role-based home                                              | P1    |
| MOB-02 | Offline storage + sync queue + sync status badge (skeleton)                         | P1    |
| MOB-03 | Feature screens: production (P5), attendance (P6), GRN (P7), dispatch/delivery (P9) | P5–P9 |
| MOB-04 | A full working day offline; syncs with no duplicates; conflict handling             | P12   |
| MOB-05 | Android release APK                                                                 | P12   |

**Basics from the Functional Spec needed to run the business (CP1, basic depth)**

| ID     | Feature                                                                                                                                                                                              | Phase |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- |
| EXP-01 | Expense categories (labour, coal, diesel, electricity, vehicle, machinery, repairs, salary, food, rent, office, govt charges, bank charges, misc)                                                    | P10   |
| EXP-02 | Expense entry by kiln with payment mode Cash / Bank / UPI / Credit                                                                                                                                   | P10   |
| CSH-01 | Opening/closing cash; cash receipts/payments; bank deposit, withdrawal and transfer (contra); bank charges; cheque no. / UPI ref on vouchers                                                         | P10   |
| DSH-01 | Owner dashboard answering the "Key Management Questions": production today/month/year, stock, sold/dispatched, receivables, payables, labour payable, coal/diesel used, cost per 1,000, gross margin | P11   |
| DSH-02 | Monthly charts: production, sales, collection, expenses, fuel                                                                                                                                        | P11   |
| CST-01 | Cost per 1,000 bricks by kiln and month (labour, coal, soil, electricity, loading, repairs, other) vs selling price → gross margin                                                                   | P11   |
| RPT-01 | Excel/PDF export for the main reports                                                                                                                                                                | P11   |
| ONB-01 | Go-live onboarding: CSV import of parties, items, opening balances and opening stock (not historical transactions; those are excluded in the SOW)                                                    | P13   |

### 11.2 Client Phase 2: Advanced (do NOT build during CP1; status ⏭️)

**From the SOW (Phase 2 column)**

| ID     | Feature                                                           | Phase |
| ------ | ----------------------------------------------------------------- | ----- |
| AI-01  | AI anomaly: predictive coal efficiency + anomaly alerts (SOW #13) | A5    |
| IOT-01 | Weighbridge scale integration (SOW #14)                           | A6    |
| IOT-02 | Kiln thermal sensor integration (SOW #14)                         | A6    |

**In the Functional Spec V1 but beyond the SOW's MVP rows (proposed for CP2; confirm with the client)**

| ID     | Feature                                                                                             | Phase |
| ------ | --------------------------------------------------------------------------------------------------- | ----- |
| ADV-01 | Bank reconciliation                                                                                 | A1    |
| ADV-02 | Cheque lifecycle (issued/deposited/cleared/bounced, post-dated cheques)                             | A1    |
| ADV-03 | Cash flow statement                                                                                 | A1    |
| ADV-04 | Profitability comparisons by brick type and customer; "most profitable kiln/type/customer" analysis | A3    |
| ADV-05 | Leakage reports (stock, cash, fuel variance)                                                        | A3    |
| ADV-06 | Custom role/permission matrix editor                                                                | A4    |
| ADV-07 | In-app backup/restore and full data export                                                          | A4    |

**Candidates not in the PDFs (need client approval and a quote)**
e-Invoice (IRN), e-Way Bill, GSTR JSON upload format, SMS/WhatsApp alerts (gateway fees paid by the client per the SOW), photo/signature proof of delivery, Hindi/regional languages, iOS App Store release (client pays the Apple fee), GPS vehicle tracking, inter-kiln stock transfer. Add new ideas found during the build here.

## 12. Internal build roadmap: copy into `.brain/PROGRESS.md`

Each step = one session. Every step ends green and committed (§3). Mobile screens are built **inside** the module phase that needs them, not saved for the end.

### For Client Phase 1 (MVP)

| Phase                                                  | Steps (one session each)                                                                                                                                                                                     | Feature IDs                              | Exit criteria                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- | ----------------------------------------------------------------------- |
| **P0** Foundation                                      | P0.1 brain+docs+AI files · P0.2 monorepo+backend · P0.3 web · P0.4 mobile · P0.5 CI+verify                                                                                                                   | —                                        | All apps run, CI green, brain + docs + FEATURES complete                |
| **P1** Core platform                                   | P1.1 backend: auth, tenancy guard, companies, kilns, FY, users, roles, audit · P1.2 web: login, shell, DS primitives, company/kiln/user screens · P1.3 mobile: login, widgets, router, Drift + sync skeleton | ADM-01…07, MOB-01/02                     | Owner signs in on web + mobile, creates a company/kiln/users with roles |
| **P2** Accounting engine                               | P2.1 backend: CoA seed, groups, voucher types, PostingService + tests, opening balances · P2.2 web: voucher entry, Day Book, Ledger, Trial Balance                                                           | ACC-01…05, ADM-08                        | Manual vouchers post balanced entries; TB correct (tests)               |
| **P3** Masters                                         | P3.1 backend: parties (+auto ledger), items, units, warehouses, brick types, vehicles, drivers, HSN/GST · P3.2 web: master screens + party ledger                                                            | PTY-*, INV-01/02, PRD-01, VEH-01, GST-01 | Masters CRUD on web; party ledgers live                                 |
| **P4** Inventory                                       | P4.1 backend: StockService, opening stock, adjustments + tests · P4.2 web: stock screens and reports                                                                                                         | INV-03…07                                | Stock formula verified by tests                                         |
| **P5** Production                                      | P5.1 backend · P5.2 web · P5.3 mobile (offline entry)                                                                                                                                                        | PRD-02…07                                | Production auto-updates stock                                           |
| **P6** Labour & Sardar                                 | P6.1 backend (wages, advances, settlement postings + tests) · P6.2 web · P6.3 mobile attendance                                                                                                              | LAB-*                                    | Wages and advances post correctly; settlement statement matches         |
| **P7** Purchases                                       | P7.1 backend · P7.2 web · P7.3 mobile GRN                                                                                                                                                                    | PUR-*, GST-03, ACC-06 (purchase side)    | PO→GRN→bill→payment posts stock + accounts                              |
| **P8** Sales & GST invoicing                           | P8.1 backend (GST calc + tests, invoice PDF) · P8.2 web                                                                                                                                                      | SAL-*, GST-02, ACC-06 (sales side)       | Correct CGST/SGST vs IGST; ageing correct                               |
| **P9** Dispatch & Transport                            | P9.1 backend · P9.2 web · P9.3 mobile dispatch/delivery                                                                                                                                                      | DSP-*, VEH-02…07                         | Confirmed dispatch reduces stock and links the invoice; vehicle P&L     |
| **P10** Expenses, cash/bank, statements, GST registers | P10.1 backend · P10.2 web                                                                                                                                                                                    | EXP-*, CSH-01, ACC-07…10, GST-04…06      | Cash/bank books, P&L, BS, GSTR-1/3B registers correct                   |
| **P11** Dashboard & costing                            | P11.1 backend aggregates · P11.2 web dashboard + exports                                                                                                                                                     | DSH-*, CST-01, RPT-01                    | Dashboard answers every key management question                         |
| **P12** Mobile hardening                               | P12.1 offline/sync hardening + full-day test · P12.2 APK release                                                                                                                                             | MOB-04/05                                | Works offline a full day; no duplicates                                 |
| **P13** MVP go-live                                    | P13.1 e2e core flows + security review · P13.2 deploy (Render/Vercel/Supabase) + backups · P13.3 CSV onboarding + user guide + UAT                                                                           | ADM-09, ONB-01                           | **CP1 MVP released and signed off by the client**                       |

### For Client Phase 2 (Advanced), only after CP1 sign-off

| Phase | Scope                                                           | Feature IDs                      |
| ----- | --------------------------------------------------------------- | -------------------------------- |
| A1    | Advanced banking & accounting                                   | ADV-01…03                        |
| A2    | Advanced GST (only if approved)                                 | e-Invoice, e-Way Bill, GSTR JSON |
| A3    | Advanced profitability & leakage analytics                      | ADV-04/05                        |
| A4    | Admin extras                                                    | ADV-06/07                        |
| A5    | AI anomaly                                                      | AI-01                            |
| A6    | IoT integrations                                                | IOT-01/02                        |
| A7    | Approved extras (notifications, POD photo, languages, iOS, GPS) | candidates                       |

## 13. AGENTS.md content requirements

`AGENTS.md` (≤ 150 lines) must contain: one-paragraph summary; **CP vs internal phase explanation + the MVP depth rule**; stack table; repo map; read order; the brain update protocol (§7); the **session safety rules (§3)**; the top 15 rules from §10; install/run/test/lint commands per app; a "where to put new code" cheat-sheet; and the **definition of done**:

> code + tests + lint/typecheck/build green + FEATURES.md and API_INDEX wiring updated + `pnpm status` run + PROGRESS "Resume here" updated + modules/API/DB brain files updated + `docs/13-roadmap-and-status.md` updated + CHANGELOG entry + committed.

`CLAUDE.md`, `GEMINI.md`, `.cursor/rules/brics.mdc` and `.github/copilot-instructions.md` only point to AGENTS.md (plus any tool-specific note).

## 14. Seed `.brain/OPEN_QUESTIONS.md` with at least

1. Confirm the CP1/CP2 split in §11 (especially ADV-01…07, which the Functional Spec lists but the SOW MVP rows do not).
2. GST rates to seed for bricks (usually HSN 6904; kiln bricks have a special GST option, 12% with ITC or 6% without ITC, so the client's CA must confirm) and for common purchases (coal, sand, spare parts; note that diesel is outside GST).
3. Default chart of accounts structure: Tally-style groups OK?
4. Closing stock valuation for P&L/BS: weighted average cost, or a standard rate per 1,000 bricks entered at period end?
5. Single business with multiple companies, or SaaS for many clients (billing/subscription is out of CP1 either way)?
6. Supervisor app language: English only in CP1, or Hindi too?
7. Brick grades actually used by the client, and their naming.
8. Piece-rate structure: per activity per 1,000? Who records loading counts?
9. Is inter-kiln stock transfer needed in CP1?
10. Login by mobile number + OTP (needs an SMS gateway, a client cost) or password only?

## 15. Phase 0 progress (update if this prompt is re-run)

As of 2026-10-08: **P0.1–P0.5 ✅, P1.1a ✅, P1.1b ✅ — next is P1.2 (web).** The build is split into a **P track** (P0–P13, backend + web, built here) and an **M track** (M0–M6, the Flutter app, built later wherever the Flutter SDK is available). This status line goes stale — **`.brain/PROGRESS.md` → "Resume here" is the authority.** Do not redo finished steps.

## 16. Finish this session with

1. Verify: `pnpm install` works; backend starts and `/api/v1/health` returns OK; web shows the themed shell; `flutter analyze` is clean and the app shows a themed screen (or Flutter is logged as a blocker); CI files exist; everything is committed.
2. Update `.brain/FEATURES.md`, `.brain/PROGRESS.md` (P0 ✅ or the exact step reached, Resume here filled, next = P1.1), `.brain/CHANGELOG.md`, `docs/13-roadmap-and-status.md`.
3. A short report: what was created, how to run it, blockers, and the open questions.

**Do not start P1 until I say so.**
