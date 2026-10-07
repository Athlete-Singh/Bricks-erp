# M04 Labour & Sardar Engine

**Purpose:** Labour groups under Sardars, attendance, piece-rate wages per 1,000, advances, deductions, seasonal settlement, labour ledger.
**Phase:** P6 · **Status:** ⬜ not started

## Features
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

## Tables (planned)
labour_groups, workers, attendance, wage_rates, wage_entries, advances, deductions, settlements

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: groups, workers, attendance, wage rates, advances, settlement statement, labour ledger. Mobile: attendance.

## Postings
Wage accrual Dr Wages Cr Sardar; advance Dr Labour Advances Cr Cash/Bank; recovery; payment.

## Known gaps / notes
-
