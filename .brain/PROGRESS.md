# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P1.1b ✅ done → **next: P1.2** (web login page wired to auth API, company/kiln switcher, user/role management screens) · **CP1 features done:** 0 / 89 (0 %)
Legend: ⬜ · 🟨 · 🧩 · ✅ · ⚠️ · ⏭️ (see FEATURES.md)

## ▶ Resume here (update at end of EVERY session)
- **Last green commit:** `<p1.1b>` — `docs(brain): update tracking after P1.1b` (2026-10-08), branch `feat/p1.1b-tenancy-rbac` (**not yet merged to `main`**). Gate green: lint ✓ typecheck ✓ test ✓ build ✓, backend 31 unit + 22 e2e, migrations up **and** down verified, `pnpm seed` idempotent.
- **Verified against a running API** (seeded DB, `node dist/main.js`): login returns a single-wrapped `{data}`, role `owner` with its 4 permission codes, the bootstrap company and kiln; `GET /users` contains no password hash; `GET /audit-logs` returns `{data, meta}` with the LOGIN entry; an invalid login body returns 400 `VALIDATION_FAILED` with per-field details.

### First run on a fresh database
`pnpm db:up` → `pnpm --filter @brics/backend migration:run` → set `SEED_OWNER_MOBILE` + `SEED_OWNER_PASSWORD` in `backend/.env` → `pnpm seed`.
That creates the 9 roles, one company, one kiln and one Owner. The bootstrap refuses to run if any user already exists.
- **Done:**
  - P0.1 ✅ git, PDFs, brain, docs 01–13, AI entry files, `pnpm status` generator.
  - P0.2 ✅ monorepo, shared package, docker-compose, NestJS 11 backend, `/health`, migrations, unit + e2e.
  - P0.3 ✅ web shell — app router, DS primitives (Button/Card/Badge/Input/Skeleton/EmptyState), layout (Sidebar/Topbar/PageHeader/KilnSwitcher), lib + stores, features/system health hook, 1 Vitest test.
  - P0.4 🟨 mobile folder structure only (device A); full scaffold on device B.
  - P0.5 ✅ CI workflow, Husky pre-commit + commit-msg, .prettierignore fix.
  - P1.1a ✅ backend auth & RBAC skeleton: 11 entities, JWT access+refresh, guards, CRUD controllers, migration, first tests.
  - P1.1b ✅ **repair of P1.1** — see "Why P1.1b existed" below. Tenant isolation, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening. 31 unit + 22 e2e green.
- **Half-done:** none.
- **Next step (exact):** P1.2 — web login page wired to `POST /auth/login`, auth store (Zustand + token storage), refresh-on-401 in `lib/api-client.ts` (the current one has no refresh path), protected dashboard route guard, company switcher on `POST /auth/switch-company`, kiln switcher on `GET /sites`, user & role management screens on `/users` + `/users/roles`, audit viewer on `/audit-logs`.
- **Then:** P1.3 (mobile login + sync setup) → P2.1 (accounting engine) → …

### Why P1.1b existed (read before marking any step ✅)
P1.1 was committed as `BE ✅ / Tests ✅` for ADM-01…07, but an audit found the backend did not meet those requirements:
cross-tenant read **and write** on six endpoints (`company_id` taken from the URL, never checked); `password_hash` returned by `GET /users`;
every response double-wrapped `{data:{data}}`; Zod validation failures surfacing as 500; the 9 roles never seeded, so `RolesGuard` denied
every permissioned route; the audit log a table with no writer; and ADM-02 switch-company, ADM-04 FY create/activate, ADM-05 change-password
all simply absent. `pnpm status` could not catch the wiring gap because its generator ignored `BE 🧩`.
**Lesson for every future step:** a column is ✅ only when a test proves it, not when the file exists. Tenancy and audit are in the
"never cut correctness" list — give them an e2e test in the same step, as `backend/test/tenancy.e2e-spec.ts` now does.

### Known gaps carried forward (not blocking P1.2)
- List endpoints other than `/audit-logs` do not paginate; `CONVENTIONS.md` specifies `?page&limit` → `meta`.
- Company/Site/FinancialYear responses are raw entities; only users go through a response DTO (`UserSummary`).
- `BusinessRuleException` is defined and tested but never thrown — domain error codes (`MODULE_REASON`) are not adopted yet. Adopt from P2, where posting/stock rules need them.
- `QueryFailedError` is not mapped in `AllExceptionsFilter`, so an unhandled DB constraint violation is a 500.
- No request/correlation id in error responses, so a 500 cannot be traced to its Pino log line.

- **Work split (2026-10-07):** backend + web are built on device A (no Flutter). The Flutter app is built on device B. Each device uses its own Resume block. `git pull` before and `git push` after every session. Device B edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

## ▶ Resume here: mobile (device B, with Flutter)
- **State:** P0.4 🟨 *structure only*. `mobile/` has `pubspec.yaml` (no packages yet), `lib/main.dart` + `lib/app.dart` placeholder, `test/app_test.dart`, every `lib/core/*` and `lib/features/<auth|production|attendance|grn|dispatch|sync>/{data,domain,presentation}` folder (with .gitkeep), `env/dev.example.json`, and `mobile/README.md` with the setup commands.
- **Next step (exact):** follow `mobile/README.md` "First time" (flutter create, pub add, analyze, test) → build the P0.4 scaffold (theme tokens from docs/05, core widgets, go_router, dio client, Drift stub, sync skeleton, l10n) → `flutter analyze` + `flutter test` green → P0.4 ✅ → commit + push. Then the mobile steps in order: P1.3 → P5.3 → P6.3 → P7.3 → P9.3 → P12.
- **APIs waiting for mobile:** see the wiring gaps in `.brain/API_INDEX.md` (rows with Mob ⬜/🧩).
- **Blockers:** none.
- **Blockers:** none. Flutter SDK is needed on the build machine for P0.4.

## CP1 internal steps
| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest — app router, DS primitives, layout components, health hook | ✅ |
| P0 | P0.4 | Mobile scaffold: folder structure + placeholder app ✅ (device A); flutter create, packages, theme, widgets, router, Drift stub, l10n, analyze/test (device B) | 🟨 |
| P0 | P0.5 | CI, Husky hooks, commitlint, verify, tracking | ✅ |
| P1 | P1.1a | Backend: auth, companies, kilns, FY, users, roles — entities, JWT, guards, CRUD | ✅ |
| P1 | P1.1b | Backend repair: tenant isolation + tests, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening | ✅ |
| P1 | P1.2 | Web: login, shell, DS primitives, company/kiln/user screens | ⬜ |

| P1 | P1.3 | Mobile: login, widgets, router, Drift + sync skeleton | ⬜ |
| P2 | P2.1 | Backend: CoA seed, groups, voucher types, PostingService, opening balances | ⬜ |
| P2 | P2.2 | Web: voucher entry, Day Book, Ledger, Trial Balance | ⬜ |
| P3 | P3.1 | Backend masters (parties+auto ledger, items, units, warehouses, brick types, vehicles, drivers, HSN/GST) | ⬜ |
| P3 | P3.2 | Web master screens + party ledger | ⬜ |
| P4 | P4.1 | Backend StockService, opening stock, adjustments + tests | ⬜ |
| P4 | P4.2 | Web stock screens + reports | ⬜ |
| P5 | P5.1 / P5.2 / P5.3 | Production backend / web / mobile | ⬜ |
| P6 | P6.1 / P6.2 / P6.3 | Labour backend / web / mobile attendance | ⬜ |
| P7 | P7.1 / P7.2 / P7.3 | Purchases backend / web / mobile GRN | ⬜ |
| P8 | P8.1 / P8.2 | Sales & GST backend (+PDF) / web | ⬜ |
| P9 | P9.1 / P9.2 / P9.3 | Dispatch & transport backend / web / mobile | ⬜ |
| P10 | P10.1 / P10.2 | Expenses, cash/bank, P&L/BS, GSTR registers backend / web | ⬜ |
| P11 | P11.1 / P11.2 | Dashboard aggregates / web dashboard + exports | ⬜ |
| P12 | P12.1 / P12.2 | Mobile offline hardening / APK release | ⬜ |
| P13 | P13.1 / P13.2 / P13.3 | e2e+security / deploy+backups / onboarding+guide+UAT → **CP1 sign-off** | ⬜ |

Exit criteria per phase: see BRICS_MASTER_PROMPT.md §12.

## CP2 (only after CP1 sign-off)
A1 banking/accounting adv · A2 adv GST (if approved) · A3 profitability/leakage · A4 admin extras · A5 AI anomaly · A6 IoT · A7 approved extras — all ⏭️

## Splits recorded
- **P1.1 → P1.1a + P1.1b** (2026-10-08). P1.1a is the original backend auth/RBAC commit `54b2d13`. P1.1b is the repair: tenant isolation,
  RBAC seed, audit trail, API contract and the ADM endpoints P1.1 never built. Split recorded because P1.1 had been marked ✅ while
  ADM-02/04/05/06/07 were incomplete and tenancy was unenforced.
