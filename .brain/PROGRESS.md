# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P2.1c ✅ done → **next: P2.2** (web: voucher entry + the books) — **P2.1 backend complete** (web login page wired to auth API, company/kiln switcher, user/role management screens) · **CP1 features done:** 6 / 101 (6 %)
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
  - P0.4 ✅ **closed** — mobile folder structure, placeholder app, widget test, `env/dev.example.json`, `mobile/README.md`. That was everything P0.4 could do without the Flutter SDK; **the rest of the original P0.4 (flutter create, packages, theme, widgets, router, Drift, l10n) is now step M0.** P0.4 is not pending — do not reopen it.
  - P0.5 ✅ CI workflow, Husky pre-commit + commit-msg, .prettierignore fix.
  - P1.1a ✅ backend auth & RBAC skeleton: 11 entities, JWT access+refresh, guards, CRUD controllers, migration, first tests.
  - P1.2a ✅ web auth foundation: `api-client` (envelope unwrap, typed `ApiError`, single-flight 401→refresh→retry), token custody per ADR-016, auth store, login page, `AuthGuard`, sign-out. Verified in a real browser against the running API: login → dashboard, hard reload restores the session, sign-out clears both sides.
  - P1.2b ✅ web shell: user dropdown + change-password, company switcher, kiln switcher, permission-aware nav, and the company / kilns / financial-year screens. **ADM-01…04 are the first features to reach ✅.** Sidebar turned into a drawer below `md` — it was a 224 px rail on a 375 px phone, which broke the entry screens the new CONVENTIONS rule exists to protect.
  - P2.1c ✅ the books: Day Book, Ledger statement with a running balance on the ledger's natural side, Trial Balance proving Σ Dr = Σ Cr. Verified on real journals — a reversal leaves the trial balance balanced because both entries stay in. e2e 38 → 53.
  - P2.1b ✅ **`PostingService`** — the spine. Balanced, FY-gated, tenant-checked, written in the **caller's** transaction so a document and its journal commit together. Gapless voucher numbering under 8 concurrent posts, and a rejected post does not burn a number. Reversal instead of editing; no update route exists. Manual vouchers (receipt/payment/contra/journal). Backend 64 → 97 unit, e2e 22 → 38.
  - P2.1a ✅ chart of accounts: 22 Tally-style groups, 28 ledgers, 8 voucher types, **seeded per company inside company creation** so a tenant cannot exist without somewhere to post. Opening balances (ACC-04) transactional, and honest about an unbalanced set rather than refusing it. Four DB CHECK constraints verified against Postgres. Backend tests 31 → 64.
  - P1.2c ✅ web admin: users list + create + edit (role, kiln access, active), and the Owner's audit viewer with filters and paging. **ADM-05…07 complete — P1 is done on the web side.** Fixed a shared-schema bug that made every optional text field reject a blank value.
  - P1.1b ✅ **repair of P1.1** — see "Why P1.1b existed" below. Tenant isolation, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening. 31 unit + 22 e2e green.
- **Half-done:** none.
- **Next step (exact):** **P2.2 — the web side of accounting**, which closes ACC-01…05 and finishes phase P2. Voucher entry form (receipt/payment/contra/journal) with a live running Dr/Cr total that blocks submit until it balances and shows the difference; Day Book on `GET /reports/day-book`; Ledger statement on `GET /reports/ledgers/:id`; Trial Balance on `GET /reports/trial-balance` with the difference surfaced when openings do not tie; chart-of-accounts and opening-balance screens on the P2.1a endpoints. All of it reuses `DataTable`, `Dialog`, `Select` and `Pagination` from P1.2.
- **Watch in P2.2:** money is a **string** end to end (CONVENTIONS) — never parse a voucher amount into a JS number for arithmetic in the browser either.
- **Then:** P1.3 (mobile login + sync setup) → P2.1 (accounting engine) → …

### Why P1.1b existed (read before marking any step ✅)
P1.1 was committed as `BE ✅ / Tests ✅` for ADM-01…07, but an audit found the backend did not meet those requirements:
cross-tenant read **and write** on six endpoints (`company_id` taken from the URL, never checked); `password_hash` returned by `GET /users`;
every response double-wrapped `{data:{data}}`; Zod validation failures surfacing as 500; the 9 roles never seeded, so `RolesGuard` denied
every permissioned route; the audit log a table with no writer; and ADM-02 switch-company, ADM-04 FY create/activate, ADM-05 change-password
all simply absent. `pnpm status` could not catch the wiring gap because its generator ignored `BE 🧩`.
**Lesson for every future step:** a column is ✅ only when a test proves it, not when the file exists. Tenancy and audit are in the
"never cut correctness" list — give them an e2e test in the same step, as `backend/test/tenancy.e2e-spec.ts` now does.

### Known gaps carried forward (not blocking P2)
- List endpoints other than `/audit-logs` do not paginate; `CONVENTIONS.md` specifies `?page&limit` → `meta`.
- Company/Site/FinancialYear responses are raw entities; only users go through a response DTO (`UserSummary`).
- ~~`BusinessRuleException` never thrown~~ — **adopted in P2.1a** (`LEDGER_SYSTEM_REQUIRED`, `LEDGER_SYSTEM_GROUP_FIXED`, verified returning 422). Keep using it for posting rules.
- `QueryFailedError` is not mapped in `AllExceptionsFilter`, so an unhandled DB constraint violation is a 500.
- No request/correlation id in error responses, so a 500 cannot be traced to its Pino log line.
- **No "create company" screen.** `POST /companies` is built and tested but no UI calls it, so a second company can only be
  created through the API or the seed. ADM-01/ADM-02 do not ask for it in writing (the switcher and the multi-company schema
  are what they specify), but an owner who wants a second kiln business cannot add one from the web today. Small screen,
  reuses `CompanyForm` — fold into P2.2 or a later admin pass unless the client needs it sooner.
- `GET /companies/:id` has no consumer either: the web reads `/companies/current` instead. Harmless, kept for the
  company-detail screen that would come with the above.

- **Work split (updated 2026-10-08):** the **P track** (backend + web) is built here; the **M track** (Flutter app) is built later, wherever the Flutter SDK is available — another machine, or this one once Flutter is installed. **Backend and web come first either way.** Each track keeps its own Resume block below. Whoever builds the M track edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

## ▶ Resume here: M track — the Flutter app (needs the Flutter SDK)
- **State:** M0 not started. `mobile/` holds `pubspec.yaml` (no packages), `lib/main.dart` + `lib/app.dart` placeholders,
  `test/app_test.dart`, the full `lib/core/*` and `lib/features/<auth|production|attendance|grn|dispatch|sync>/{data,domain,presentation}`
  folder tree, `env/dev.example.json` and `mobile/README.md`.
- **Flutter is not installed in the current environment.** Nothing in `mobile/` is built, analysed or tested here, and `mobile/` must never be reported as red or blocking.
- **Where this runs:** any machine with the Flutter SDK. If no second machine turns up, install Flutter here — but only **after** the backend and web are substantially done, so the P track is never interrupted.
- **Next step (exact):** M0 — follow `mobile/README.md` "First time" (`flutter create`, `flutter pub add`, analyze, test), then
  build the scaffold: theme tokens from `docs/05-design-system.md`, core widgets, go_router, dio client, Drift stub, sync
  skeleton, l10n → `flutter analyze` + `flutter test` green → commit + push. Then M1 → M6 in order.
- **Before starting M2:** confirm `SYN-01` (`Idempotency-Key`) shipped in P5.1. Without it, every offline retry creates a duplicate.
- **What M0 is:** the half of the original P0.4 that needed Flutter. P0.4 itself is closed — see the Done list above.
- **APIs ready for mobile now:** `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/sites` — all tested, see `API_INDEX.md`.
- **Blockers:** none. The only prerequisite is a Flutter SDK, and nothing in the P track waits on it.

## CP1 internal steps

**Two independent tracks.** The **P track** (backend + web) runs on this machine. The **M track** (Flutter) runs on a machine
with the Flutter SDK and starts only once the P track is far enough along — the app has no APIs to call before then.
The P track is never blocked by the M track.

### P track — backend + web (here; no Flutter needed)

| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest | ✅ |
| P0 | P0.4 | Mobile **folder structure only** (no Flutter needed) — the rest is M0 | ✅ |
| P0 | P0.5 | CI, Husky hooks, commitlint, verify, tracking | ✅ |
| P1 | P1.1a | Backend auth, companies, kilns, FY, users, roles — entities, JWT, guards, CRUD | ✅ |
| P1 | P1.1b | Backend repair: tenant isolation + tests, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening | ✅ |
| P1 | P1.2a | **Web auth foundation:** api-client envelope + refresh-on-401, auth store, login page, route guard, logout | ✅ |
| P1 | P1.2b | Web shell wiring: user menu, company switcher, kiln switcher, permission-aware nav, company/kilns/FY screens | ✅ |
| P1 | P1.2c | Web admin: users & roles screens, audit log viewer, DataTable/Select/Dialog primitives | ✅ |
| P2 | P2.1a | **Backend: chart of accounts** — ledger groups, ledgers, voucher types, migration, per-company seed, opening balances (ACC-01, ACC-04) | ✅ |
| P2 | P2.1b | Backend: `PostingService` (balanced, atomic, FY-checked, immutable + reversal) and manual vouchers — receipt, payment, contra, journal (ACC-02, ACC-03) | ✅ |
| P2 | P2.1c | Backend reports: Day Book, Ledger statement, Trial Balance (ACC-05) | ✅ |
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

### M track — Flutter supervisor app (later, wherever Flutter is installed)

**M1 can start as soon as P1.2 is done** (the auth API it needs is already built and tested) — but the plan is to finish the
backend and web first. Whoever builds this track edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

| Step | Scope | Needs from the P track | Status |
|---|---|---|---|
| M0 | `flutter create`, packages, theme tokens, core widgets, go_router, dio client, Drift stub, l10n, analyze + test green — **this is the unfinished half of the old P0.4** | — | ⬜ |
| M1 | Login, kiln selection, role-based home, offline storage + sync queue skeleton (MOB-01/02) | P1.1b ✅ | ⬜ |
| M2 | Production entry offline (PRD-06) | P5.1 **incl. SYN-01** | ⬜ |
| M3 | Attendance offline (LAB-02) | P6.1 | ⬜ |
| M4 | GRN offline (PUR-02) | P7.1 | ⬜ |
| M5 | Dispatch + delivery acknowledgement (DSP-04) | P9.1 | ⬜ |
| M6 | Offline hardening (MOB-04), Android APK (MOB-05), **iOS build (MOB-06)** | all of the above | ⬜ |

> **Why M2–M5 must wait for `SYN-01`:** the app queues entries offline and resends them when the network returns. Without
> `Idempotency-Key` on the create endpoints, every retry creates a **duplicate** production entry, GRN or dispatch. That is
> backend work, buildable here without Flutter, and it is scheduled into P5.1 for exactly this reason.

### Step exit criteria that are easy to miss
A step is **not** ✅ until these are true. Check this list before marking any of them done.

| Step | Must also be true |
|---|---|
| **P5.1** | `SYN-01` shipped: `idempotency_keys` table + the mechanism, **written in the same transaction as the business insert** (not after it), with a test proving a repeated `Idempotency-Key` returns the original result and creates no second row. `SYN-02` delta pull on the masters the app caches. **Without SYN-01, P5.1 is not done and M2 cannot start.** |
| **P5.1 / P6.1 / P9.1** | The matching leakage report (`LEK-01`+`LEK-02` / `LEK-03` / `LEK-04`) ships **with** the module, not later. These are the client's ROI — see M13 in FEATURES.md. |
| **P6.1** | `LEK-03`'s warning fires **at the moment a new advance is entered**, not only in a report. |
| **any tenant-scoped module** | A cross-tenant refusal test in `backend/test/*.e2e-spec.ts`, as `tenancy.e2e-spec.ts` does. CONVENTIONS requires it. |
| **P5.2 / P6.2 / P7.2 / P9.2** | The entry screen is usable on a phone browser (single column, ≥44 px targets, numeric keypads). Where there is signal this is how the field actually enters data until the Flutter app exists — see CONVENTIONS → Web. |
| **any new create endpoint** | Decide explicitly whether the mobile app will ever call it. If yes, it needs `Idempotency-Key`. |

### Gate per track
- **P track (here):** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + `pnpm --filter @brics/backend test:e2e`.
  **Do not run `flutter analyze` / `flutter test` here — the SDK is not installed.** `mobile/` is not touched by the P track and is never a blocker for it.
- **M track (where Flutter is installed):** the above **plus** `dart run build_runner build -d && flutter analyze && flutter test`.

Exit criteria per phase: see BRICS_MASTER_PROMPT.md §12.

## CP2 (only after CP1 sign-off)
A1 banking/accounting adv · A2 adv GST (if approved) · A3 profitability/leakage · A4 admin extras · A5 AI anomaly · A6 IoT · A7 approved extras — all ⏭️

## Splits recorded
- **P2.1 → P2.1a + P2.1b + P2.1c** (2026-10-08). The chart of accounts, the posting engine and the reports are each a session's
  work, and `PostingService` is the one piece the whole product rests on — it gets a step to itself so its tests are not rushed.
- **P1.2 → P1.2a + P1.2b + P1.2c** (2026-10-08). One session could not cover auth plumbing, shell wiring and three admin
  screen sets. P1.2a is the foundation every later screen needs (envelope handling, token refresh, route guard).
- **P1.1 → P1.1a + P1.1b** (2026-10-08). P1.1a is the original backend auth/RBAC commit `54b2d13`. P1.1b is the repair: tenant isolation,
  RBAC seed, audit trail, API contract and the ADM endpoints P1.1 never built. Split recorded because P1.1 had been marked ✅ while
  ADM-02/04/05/06/07 were incomplete and tenancy was unenforced.
