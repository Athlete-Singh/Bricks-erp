# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P1.1b ✅ done → **next: P1.2** (web login page wired to auth API, company/kiln switcher, user/role management screens) · **CP1 features done:** 0 / 101 (0 %)
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
  - P0.4 ✅ mobile folder structure (all the P track owes mobile). The Flutter scaffold is **M0** on device B.
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
- **State:** M0 not started. `mobile/` holds `pubspec.yaml` (no packages), `lib/main.dart` + `lib/app.dart` placeholders,
  `test/app_test.dart`, the full `lib/core/*` and `lib/features/<auth|production|attendance|grn|dispatch|sync>/{data,domain,presentation}`
  folder tree, `env/dev.example.json` and `mobile/README.md`.
- **Flutter is NOT installed on device A and will not be.** Nothing in `mobile/` is built, analysed or tested there.
- **Next step (exact):** M0 — follow `mobile/README.md` "First time" (`flutter create`, `flutter pub add`, analyze, test), then
  build the scaffold: theme tokens from `docs/05-design-system.md`, core widgets, go_router, dio client, Drift stub, sync
  skeleton, l10n → `flutter analyze` + `flutter test` green → commit + push. Then M1 → M6 in order.
- **Before starting M2:** confirm `SYN-01` (`Idempotency-Key`) shipped in P5.1. Without it, offline retries create duplicates.
- **APIs ready for mobile now:** `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/sites` — all tested, see `API_INDEX.md`.
- **Blockers:** none, beyond needing a machine with the Flutter SDK.

## CP1 internal steps

**Two independent tracks.** The **P track** (backend + web) runs on this machine. The **M track** (Flutter) runs on a machine
with the Flutter SDK and starts only once the P track is far enough along — the app has no APIs to call before then.
The P track is never blocked by the M track.

### P track — backend + web (device A)

| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest | ✅ |
| P0 | P0.4 | Mobile **folder structure only** (no Flutter needed) — the rest is M0 | ✅ |
| P0 | P0.5 | CI, Husky hooks, commitlint, verify, tracking | ✅ |
| P1 | P1.1a | Backend auth, companies, kilns, FY, users, roles — entities, JWT, guards, CRUD | ✅ |
| P1 | P1.1b | Backend repair: tenant isolation + tests, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening | ✅ |
| P1 | P1.2 | **Web: login, auth store, refresh-on-401, route guard, company/kiln switcher, user & role screens, audit viewer** | ⬜ |
| P2 | P2.1 | Backend: CoA seed, groups, voucher types, PostingService, opening balances | ⬜ |
| P2 | P2.2 | Web: voucher entry, Day Book, Ledger, Trial Balance | ⬜ |
| P3 | P3.1 | Backend masters (parties + auto ledger, items, units, warehouses, brick types, vehicles, drivers, HSN/GST, wage rates) | ⬜ |
| P3 | P3.2 | Web master screens + party ledger | ⬜ |
| P4 | P4.1 | Backend StockService, opening stock, adjustments + tests | ⬜ |
| P4 | P4.2 | Web stock screens + reports | ⬜ |
| P5 | P5.1 | Production backend + **LEK-01 brick yield variance** + **LEK-02 coal per 1,000** + **SYN-01/02 idempotency & delta pull** | ⬜ |
| P5 | P5.2 | Web production entry + the two variance reports | ⬜ |
| P6 | P6.1 | Labour backend + **LEK-03 live advance exposure, with the warning at advance entry** | ⬜ |
| P6 | P6.2 | Web attendance, wages, advances, settlement + exposure screen | ⬜ |
| P7 | P7.1 / P7.2 | Purchases backend / web (PO → GRN → bill → payment) | ⬜ |
| P8 | P8.1 / P8.2 | Sales & GST backend (+ invoice PDF) / web | ⬜ |
| P9 | P9.1 | Dispatch & transport backend + **LEK-04 gate reconciliation** | ⬜ |
| P9 | P9.2 | Web dispatch, trips, vehicle profitability + gate report | ⬜ |
| P10 | P10.1 / P10.2 | Expenses, cash/bank, P&L/BS, GSTR registers + **GST-07 reconciliation** — backend / web | ⬜ |
| P11 | P11.1 | Dashboard aggregates + **CST-01 cost per 1,000 vs the ₹4,100 benchmark** | ⬜ |
| P11 | P11.2 | Web dashboard, **RPT-02 daily report, RPT-03 sales register, RPT-04 labour registers**, exports | ⬜ |
| P13 | P13.1 / P13.2 / P13.3 | e2e + security / deploy + backups / onboarding + guide + UAT → **CP1 sign-off** | ⬜ |

### M track — Flutter supervisor app (device B, needs the Flutter SDK)

**Start M1 once P1.2 is done** (the auth API it needs is already built and tested).
Device B edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

| Step | Scope | Needs from the P track | Status |
|---|---|---|---|
| M0 | `flutter create`, packages, theme tokens, core widgets, go_router, dio client, Drift stub, l10n, analyze + test green | — | ⬜ |
| M1 | Login, kiln selection, role-based home, offline storage + sync queue skeleton (MOB-01/02) | P1.1b ✅ | ⬜ |
| M2 | Production entry offline (PRD-06) | P5.1 **incl. SYN-01** | ⬜ |
| M3 | Attendance offline (LAB-02) | P6.1 | ⬜ |
| M4 | GRN offline (PUR-02) | P7.1 | ⬜ |
| M5 | Dispatch + delivery acknowledgement (DSP-04) | P9.1 | ⬜ |
| M6 | Offline hardening (MOB-04), Android APK (MOB-05), **iOS build (MOB-06)** | all of the above | ⬜ |

> **Why M2–M5 must wait for `SYN-01`:** the app queues entries offline and resends them when the network returns. Without
> `Idempotency-Key` on the create endpoints, every retry creates a **duplicate** production entry, GRN or dispatch. That is
> backend work, buildable here without Flutter, and it is scheduled into P5.1 for exactly this reason.

### Gate per track
- **Device A (this machine):** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + `pnpm --filter @brics/backend test:e2e`.
  **Do not run `flutter analyze` / `flutter test` here — the SDK is not installed and never will be.** `mobile/` is not touched by the P track.
- **Device B:** the above **plus** `dart run build_runner build -d && flutter analyze && flutter test`.

Exit criteria per phase: see BRICS_MASTER_PROMPT.md §12.

## CP2 (only after CP1 sign-off)
A1 banking/accounting adv · A2 adv GST (if approved) · A3 profitability/leakage · A4 admin extras · A5 AI anomaly · A6 IoT · A7 approved extras — all ⏭️

## Splits recorded
- **P1.1 → P1.1a + P1.1b** (2026-10-08). P1.1a is the original backend auth/RBAC commit `54b2d13`. P1.1b is the repair: tenant isolation,
  RBAC seed, audit trail, API contract and the ADM endpoints P1.1 never built. Split recorded because P1.1 had been marked ✅ while
  ADM-02/04/05/06/07 were incomplete and tenancy was unenforced.
