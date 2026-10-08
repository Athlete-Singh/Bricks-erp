# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P0.5 ✅ done → **next: P1.1** (backend auth, RBAC, companies, kilns) · **CP1 features done:** 0 / 89 (0 %)
Legend: ⬜ · 🟨 · 🧩 · ✅ · ⚠️ · ⏭️ (see FEATURES.md)

## ▶ Resume here (update at end of EVERY session)
- **Last green commit:** `4b4be5f` — `chore(ci): add github actions ci, husky hooks` (2026-10-08). Gate green: shared + backend + web all lint ✓ typecheck ✓ test ✓. Hooks verified (commitlint rejects bad messages, lint-staged runs prettier).
- **Done:**
  - P0.1 ✅ git, PDFs, brain, docs 01–13, AI entry files, `pnpm status` generator.
  - P0.2 ✅ monorepo, shared package, docker-compose, NestJS 11 backend, `/health`, migrations, unit + e2e.
  - P0.3 ✅ web shell — app router, DS primitives (Button/Card/Badge/Input/Skeleton/EmptyState), layout (Sidebar/Topbar/PageHeader/KilnSwitcher), lib + stores, features/system health hook, 1 Vitest test.
  - P0.4 🟨 mobile folder structure only (device A); full scaffold on device B.
  - P0.5 ✅ CI workflow (postgres service, node 24, build→migrate→lint→typecheck→test→e2e→build), Husky pre-commit (lint-staged) + commit-msg (commitlint), .prettierignore fix for .brain/.
- **Half-done:** none.
- **Next step (exact):** P1.1 — backend auth + RBAC. Entities: `companies`, `kilns`, `financial_years`, `users`, `roles`, `permissions`, `audit_logs`. JWT auth (access 15m + refresh 30d). Guards: JwtAuthGuard, RolesGuard, TenantGuard (company_id from JWT). Endpoints: POST /auth/login, POST /auth/refresh, POST /auth/logout, CRUD /companies, /kilns, /users, /roles. Seed 9 roles (roles.ts). Migration. Unit + e2e tests. Commit.
- **Then:** P1.2 (web login page wired to auth API, sidebar shows company/kiln, user/role management screens) → P2.1 (accounting engine) → …
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
| P1 | P1.1 | Backend: auth, tenancy guard, companies, kilns, FY, users, roles, audit | ⬜ |
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
- _(none yet — record e.g. "P5.1 → P5.1a entities+stock, P5.1b postings" here)_
