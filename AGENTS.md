# AGENTS.md — BRICS ERP (read this first, every session)

**BRICS** is an ERP + double-entry accounting platform for brick kiln/chimney businesses, by TVAM KEY SOFTWARE PRIVATE LIMITED. It covers production (Soil → Green bricks → Drying → Firing → Sorting → Stock), Sardar/labour wages and advances, inventory, purchases, GST sales, dispatch, transport, expenses, cash/bank and full books, plus an offline supervisor app. **Core principle:** an operation recorded at the kiln creates the stock movement AND the balanced journal in one DB transaction. Scope source: `docs/client-requirements/` (03-sow-srs.pdf is the contract).

## Two kinds of phase: don't mix them up

- **Client Phase (CP):** **CP1 = MVP** (SOW modules 1–12, basic depth, so the client runs the daily business) · **CP2 = Advanced** (AI anomaly, IoT, extras deferred in `.brain/FEATURES.md`).
- **Internal step:** **P track** P0.1 … P13.3 = backend + web (CP1) · **M track** M0 … M6 = the Flutter app, built later wherever the Flutter SDK is available · A1 … A7 (CP2). **One step = one session.** List in `.brain/PROGRESS.md`.
- **MVP depth rule:** in CP1 build exactly the depth in FEATURES.md. Advanced ideas → FEATURES "CP2 candidates", not code. Never cut correctness (balanced journals, stock formula, GST split, tenancy, audit).

## Stack

| Layer   | Tech                                                                                             |
| ------- | ------------------------------------------------------------------------------------------------ |
| Backend | NestJS · TypeORM (migrations only) · PostgreSQL 16 · JWT access/refresh · Swagger · Pino         |
| Web     | Next.js 14 App Router · React 18 · TS strict · Tailwind 3 · TanStack Query · Zustand · RHF + Zod |
| Mobile  | Flutter · Riverpod · go_router · dio · freezed · Drift (offline)                                 |
| Tooling | Node 24 LTS · pnpm workspaces + Turborepo · Jest / Vitest / flutter_test · GitHub Actions        |
| Hosting | Render (API) · Vercel (web) · Supabase (DB)                                                      |

## Repo map

`backend/` API · `web/` owner panel · `mobile/` supervisor app · `packages/shared` shared TS types/Zod/enums · `packages/config` tsconfig/prettier presets · `infra/` docker-compose · `scripts/` · `docs/` human docs · `.brain/` AI memory · `BRICS_PHASE_PROMPT.md` per-session prompt.

## Read order

1. This file → 2. `.brain/00_INDEX.md` → 3. `.brain/PROGRESS.md` (**Resume here**) → 4. `.brain/FEATURES.md` rows for the step → 5. relevant `.brain/modules/*.md`. Don't scan the codebase unless the brain lacks something.

## Session safety rules

1. Repo root = this folder. One step per session; if it's too big, split it (P5.1a/b) and record the split in PROGRESS.
2. **Preflight:** tools present — P track needs node, pnpm, docker, git (**not flutter**); M track also needs flutter. `git status` clean; green gate passes **before** you start. If it's red, fix it first.
3. **Green gate before finishing:** lint, typecheck, test, build. Never end red. Revert or disable unfinished parts instead.
   **Per track:** the **P track** (backend + web) runs the JS gate only. Flutter is **not installed** in the current environment, so never run or expect `flutter analyze` / `flutter test`, and never report `mobile/` as red or blocked. The **M track** runs on whatever machine has the Flutter SDK and additionally runs `dart run build_runner build -d && flutter analyze && flutter test`. Tracks are listed in `.brain/PROGRESS.md`.
4. **Checkpoint commits** after every green slice (Conventional Commits). Never commit secrets/.env.
5. Pinned tooling, committed lockfiles, non-interactive CLI flags.
6. Dev servers only in the background; stop them when done.
7. Migrations append-only; never `synchronize: true`.
8. Context economy: brain first, open only the files you need, keep files small.
9. Always fill "Resume here" in PROGRESS before stopping.
10. Ask the user only for real business/product decisions. Log them in `.brain/OPEN_QUESTIONS.md` with the default you used.

## Brain update protocol (mandatory, every session)

- **During:** architecture choice → ADR in `.brain/DECISIONS.md`. Advanced idea → FEATURES "CP2 candidates".
- **Wiring:** whenever an endpoint is planned/built/consumed, update its row in `.brain/API_INDEX.md` (BE / Web / Mob). Use 🧩 for "built but not connected" (API no app uses yet, or screen without a live API). Never leave a side unmarked.
- **End:** update `.brain/FEATURES.md` statuses (BE/Web/Mob/Tests/Status) + API_INDEX wiring → run **`pnpm status`** (also lists wiring gaps) (regenerates the summary + `docs/13-roadmap-and-status.md`) → `PROGRESS.md` (step + Resume here) → `CHANGELOG.md` → touched `modules/*.md`, `API_INDEX.md`, `DB_SCHEMA.md`, `ACCOUNTING_RULES.md` → touched `docs/modules/*.md` → commit `docs(brain): …`.
- Brain vs code disagree → **code is truth**, fix the brain. Respect the file size limits in 00_INDEX.

## Top rules (full list in `.brain/CONVENTIONS.md`)

1. Money: `NUMERIC(18,2)` + `decimal.js` / Dart `decimal`; strings in JSON. Never floats. Brick qty = integer; rates per 1,000.
2. Every financial event → balanced journal via `PostingService`, same transaction as the document.
3. Stock changes only via `StockService`, same transaction.
4. Posted vouchers immutable → reversal / credit-debit note. FY lock respected.
5. Tenant (`company_id`) from the JWT only; every query filtered. Never trust the client.
6. RBAC: `@RequirePermissions('module.action')` on every route; 9 seeded roles.
7. Every business table: uuid id, company_id, timestamps, created_by/updated_by, soft delete where sensible; audit log on financial/stock data.
8. GST rates, HSN, wage rates = configurable data.
9. Thin controllers; logic in services; modules talk via public services only.
10. API: `/api/v1`, plural kebab resources, envelope `{data, meta}`, errors `{error:{code,message}}`, Swagger current, `Idempotency-Key` on mobile creates.
11. Web: no fetch outside `features/*/api`; TanStack Query hooks; UI only from `components/ui|shared`; tokens only.
12. Mobile: screen → provider → repository → Drift + dio; offline-first with sync queue; widgets from `core/widgets`; strings in l10n.
13. Anything used twice becomes a component/widget.
14. Tests mandatory for posting, stock, GST and tenancy logic.
15. TS strict, no unexplained `any`; Dart analyzer clean; no dead/commented code; each app's `.env.example` current (`backend/`, `web/`, `mobile/env/`).

## Commands

| Task                                             | Command                                                                                               |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| Install                                          | `pnpm install` (root) · M track also `cd mobile && flutter pub get`                                   |
| DB                                               | `docker compose -f infra/docker-compose.yml up -d`                                                    |
| Run API                                          | `pnpm --filter @brics/backend dev` → `http://localhost:4000/api/v1/health`, docs `/api/docs`          |
| Run web                                          | `pnpm --filter @brics/web dev` → `http://localhost:3000`                                              |
| Run mobile                                       | `cd mobile && flutter run --dart-define=API_BASE_URL=http://10.0.2.2:4000/api/v1`                     |
| Gate (P track)                                   | `pnpm lint && pnpm typecheck && pnpm test && pnpm build && pnpm --filter @brics/backend test:e2e`     |
| Seed                                             | `pnpm seed` (9 roles; optional first Owner via `SEED_OWNER_*`)                                        |
| Gate (M track — only where Flutter is installed) | `cd mobile && dart run build_runner build -d && flutter analyze && flutter test`                      |
| Migrations                                       | `pnpm --filter @brics/backend migration:generate src/database/migrations/<Name>` · `migration:run`    |
| Tracker                                          | `pnpm status`                                                                                         |
| First Flutter setup                              | `cd mobile && flutter create --org com.tvamkey --project-name brics_mobile --platforms=android,ios .` |

## Where to put new code

| New thing                           | Location                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------ |
| Backend domain module               | `backend/src/modules/<module>/` (module, controller, service, dto/, entities/, **tests**/) |
| Journal rules                       | `backend/src/accounting/` (+ matrix in `.brain/ACCOUNTING_RULES.md`)                       |
| Stock logic                         | `backend/src/inventory/`                                                                   |
| Guards/pipes/decorators/base entity | `backend/src/common/`                                                                      |
| Migration / seed                    | `backend/src/database/migrations/` · `seeds/`                                              |
| Shared type / Zod schema / enum     | `packages/shared/src/`                                                                     |
| Web route                           | `web/src/app/(dashboard)/<route>/page.tsx` (routes only)                                   |
| Web feature logic                   | `web/src/features/<feature>/{api,hooks,components,schemas}`                                |
| Web primitive / composed component  | `web/src/components/ui/` · `components/shared/`                                            |
| Mobile feature                      | `mobile/lib/features/<feature>/{data,domain,presentation}`                                 |
| Mobile reusable widget              | `mobile/lib/core/widgets/`                                                                 |

## Definition of done

☐ Code + tests · ☐ lint / typecheck / test / build green (+ flutter analyze/test) · ☐ FEATURES.md + API_INDEX wiring updated + `pnpm status` run · ☐ PROGRESS "Resume here" updated · ☐ modules / API_INDEX / DB_SCHEMA brain files updated · ☐ `docs/modules/*` updated · ☐ CHANGELOG entry · ☐ committed.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
