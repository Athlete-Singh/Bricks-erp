# M04 Labour & Sardar Engine

> Status: **In Progress (Backend Complete, Web Screens Pending)** · Build phase: P6
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose

Labour groups under Sardars, attendance, piece-rate wages per 1,000, advances, deductions, seasonal settlement, labour ledger, and live `LEK-03` advance exposure control.

## Planned scope (MVP depth)

| ID     | Feature                                                                                   | Phase | Status                       |
| ------ | ----------------------------------------------------------------------------------------- | ----- | ---------------------------- |
| LAB-01 | Labour groups under a Sardar; worker master                                               | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LAB-02 | Daily attendance by group/worker (web + mobile offline)                                   | P6    | 🟨 (BE ✅ / Web ⬜ / Mob ⬜) |
| LAB-03 | Wage-rate config: piece rate per 1,000 bricks by activity and daily wage                  | P6    | ✅ (BE ✅ / Web ✅)          |
| LAB-04 | Auto wage entries from production and loading counts                                      | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LAB-05 | Cash advances and loans to Sardar/workers (cash/bank/UPI)                                 | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LAB-06 | Deductions: advance recovery, loan instalment, khurak, fines                              | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LAB-07 | Wage payment and seasonal settlement statement (earned − advances − deductions = payable) | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LAB-08 | Labour ledger and outstanding per Sardar/worker                                           | P6    | 🟨 (BE ✅ / Web ⬜)          |
| LEK-03 | Live Sardar advance exposure with entry-time warning                                      | P6    | 🟨 (BE ✅ / Web ⬜)          |

## Data

- Tables created: `labour_groups`, `workers`, `labour_attendance`, `labour_advances`, `labour_deductions`, `labour_settlements`, `labour_wage_rates`.
- Foreign keys to `companies`, `sites`, `parties`, `ledgers`, and `vouchers`.

## Screens (P6.2)

Web: groups, workers, daily attendance register, advance entry with live LEK-03 warning, deductions, seasonal settlement statement, and exposure report.

## Accounting effect

- **Advances:** Debit Sardar party ledger, Credit Cash/Bank (`PMT` voucher via `PostingService`).
- **Wage Accruals:** Debit `LABOUR_WAGES` (Direct Expense), Credit Sardar party ledger (`JNL` voucher).
- **Settlement Payout:** Debit Sardar party ledger, Credit Cash/Bank (`PMT` voucher).

## How it works

1. **Groups & Workers:** Sardars organize seasonal gangs for specific kiln activities (making, loading, unloading). Workers are registered under groups with optional daily wage rates.
2. **Attendance:** Daily attendance is recorded in batches per group. Idempotency (`SYN-01`) protects offline mobile sync retries from duplicating rows.
3. **Advances & LEK-03:** When an advance is entered, a double-entry payment voucher is posted atomically, and net exposure is calculated (`advancesDrawn - wagesEarned - deductions`). If positive, a live warning is returned immediately to prevent unsecured exposure.
4. **Auto-Wage Accrual:** Wages are calculated from green brick production counts multiplied by company-configured piece rates (plus attendance daily wages) and accrued via journal voucher.
5. **Settlements:** At season end, `grossWages - advancesRecovered - deductions = netPayable`. If payable, a payment voucher is posted to settle the Sardar's account.

## How to test

- Unit tests: `pnpm --filter @brics/backend test src/modules/labour`
- E2E tests: `pnpm --filter @brics/backend test:e2e test/labour.e2e-spec.ts`
