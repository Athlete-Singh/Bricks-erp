# M04 Labour & Sardar Engine

> Status: **Planned (not started)** · Build phase: P6
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Labour groups under Sardars, attendance, piece-rate wages per 1,000, advances, deductions, seasonal settlement, labour ledger.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| LAB-01 | Labour groups under a Sardar; worker master | P6 | ⬜ |
| LAB-02 | Daily attendance by group/worker (web + mobile offline) | P6 | ⬜ |
| LAB-03 | Wage-rate config: piece rate per 1,000 bricks by activity (making, loading, unloading) and daily wage | P6 | ⬜ |
| LAB-04 | Auto wage entries from production and loading counts | P6 | ⬜ |
| LAB-05 | Cash advances and loans to Sardar/workers (cash/bank/UPI) | P6 | ⬜ |
| LAB-06 | Deductions: advance recovery, loan instalment | P6 | ⬜ |
| LAB-07 | Wage payment and seasonal settlement statement (earned − advances − deductions = payable) | P6 | ⬜ |
| LAB-08 | Labour ledger and outstanding per Sardar/worker | P6 | ⬜ |

## Data
Planned tables: labour_groups, workers, attendance, wage_rates, wage_entries, advances, deductions, settlements

## Screens
Web: groups, workers, attendance, wage rates, advances, settlement statement, labour ledger. Mobile: attendance.

## Accounting effect
Wage accrual Dr Wages Cr Sardar; advance Dr Labour Advances Cr Cash/Bank; recovery; payment.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
