# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P0.3 paused (web shell half-done) → **next: resume P0.3** · **CP1 features done:** 0 / 89 (0 %)
Legend: ⬜ · 🟨 · 🧩 · ✅ · ⚠️ · ⏭️ (see FEATURES.md)

## ▶ Resume here (update at end of EVERY session)
- **Last green commit:** `git log -1` → "chore(brain): pause after P0.2 …" (2026-10-07). Gate green: shared + backend build, lint, typecheck, unit tests, e2e (health against real Postgres).
- **Done:**
  - P0.1 ✅ git, PDFs → `docs/client-requirements/`, full brain (FEATURES 89 CP1 + 10 CP2), docs 01–13 + 16 module stubs, AGENTS/CLAUDE/GEMINI/Cursor/Copilot files, `pnpm status` generator.
  - P0.2 ✅ pnpm + Turborepo root, `packages/config`, `packages/shared` (enums, ₹/date formatters, health schema, tests), `infra/docker-compose.yml` (Postgres 16 + `brics_test`), NestJS 11 backend: env validation (zod), Pino, Swagger `/api/docs`, `/api/v1/health` with DB check, envelope + error filter, base entities, Money utils, TypeORM data source + migration CLI (verified), unit + e2e tests. One env file per app (ADR-011).
- **Half-done: P0.3 web.** Written: `web/package.json`, tsconfig, next/postcss/tailwind/eslint/vitest configs, `src/styles/tokens.css` + `globals.css`, `web/.env.example`. NOT written: `src/app/*` (layout, providers, placeholder dashboard), `components/ui` (Button, Card, Badge), `components/layout` (Sidebar, Topbar, PageHeader, KilnSwitcher), `lib/api-client.ts`, `lib/query-client.ts`, `lib/cn.ts`, `stores/ui-store.ts`, `features/system` (health API + hook → topbar status), tests. `web` is **commented out in `pnpm-workspace.yaml`** to keep the gate green.
- **Next step (exact):** uncomment `- web` in `pnpm-workspace.yaml` → `pnpm install` → write the missing web files above → web gate (lint, typecheck, test, build) → set `/health` Web ✅ in API_INDEX → commit → P0.4.
- **Then:** P0.4 mobile (write full Flutter source; on a machine with Flutter run `flutter create --org com.tvamkey --project-name brics_mobile --platforms=android,ios .`, `pub get`, `build_runner`, `gen-l10n`, analyze, test; add `mobile/env/dev.example.json`) → P0.5 (GitHub Actions CI with Postgres service, Husky pre-commit + commit-msg hooks: husky is installed but no hooks exist yet, final verify).
- **Blockers:** none. Flutter SDK is needed on the build machine for P0.4.

## CP1 internal steps
| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest (configs + tokens done; pages/components pending) | 🟨 |
| P0 | P0.4 | Mobile scaffold: source, theme, widgets, router, Drift stub, l10n, env file, test | ⬜ |
| P0 | P0.5 | CI, Husky hooks, commitlint, verify, tracking | ⬜ |
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
