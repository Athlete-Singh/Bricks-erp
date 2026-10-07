# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P0 done → **next: P1.1** · **CP1 features done:** 0 / 89 (0 %)
Legend: ⬜ · 🟨 · ✅ · ⚠️ · ⏭️ (see FEATURES.md)

## ▶ Resume here (update at end of EVERY session)
- **Last green commit:** see `git log -1` (P0 foundation commit)
- **Done last session:** P0.1–P0.5 — brain, docs, AI files, monorepo, backend/web scaffolds, mobile source scaffold, CI.
- **Half-done:** P0.4 mobile — source written by hand (no Flutter SDK on the authoring machine). On the build machine run once:
  `cd mobile && flutter create --org com.tvamkey --project-name brics_mobile --platforms=android,ios . && flutter pub get && dart run build_runner build -d && flutter gen-l10n && flutter analyze && flutter test` → fix anything → mark P0.4 ✅ and commit.
- **Next step:** finish P0.4 gate on build machine (above), then **P1.1** backend core platform.
- **Blockers:** none for backend/web. Mobile gate pending Flutter SDK on build machine.

## CP1 internal steps
| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest | ✅ |
| P0 | P0.4 | Mobile scaffold (source ✅; flutter create + analyze/test on build machine pending) | ⚠️ |
| P0 | P0.5 | CI, Husky, commitlint, verify, tracking | ✅ |
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
