# M04 Labour & Sardar Engine

**Purpose:** Labour groups under Sardars, worker master, daily attendance, piece-rate wages per 1,000, advances, deductions, auto wage accruals, seasonal settlement, live LEK-03 advance exposure.
**Phase:** P6 · **Status:** 🟨 P6.1 backend complete, P6.2 web screens pending

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| LAB-01 | Labour groups under a Sardar; worker master | P6 | 🟨 (BE ✅ / Web ⬜) |
| LAB-02 | Daily attendance by group/worker (web + mobile offline) | P6 | 🟨 (BE ✅ / Web ⬜ / Mob ⬜) |
| LAB-03 | Wage-rate config: piece rate per 1,000 bricks by activity and daily wage | P6 | ✅ (BE ✅ / Web ✅) |
| LAB-04 | Auto wage entries from production and loading counts | P6 | 🟨 (BE ✅ / Web ⬜) |
| LAB-05 | Cash advances and loans to Sardar/workers (cash/bank/UPI) | P6 | 🟨 (BE ✅ / Web ⬜) |
| LAB-06 | Deductions: advance recovery, loan instalment, khurak, fines | P6 | 🟨 (BE ✅ / Web ⬜) |
| LAB-07 | Wage payment and seasonal settlement statement (earned − advances − deductions = payable) | P6 | 🟨 (BE ✅ / Web ⬜) |
| LAB-08 | Labour ledger and outstanding per Sardar/worker | P6 | 🟨 (BE ✅ / Web ⬜) |
| LEK-03 | Live Sardar advance exposure with entry-time warning | P6 | 🟨 (BE ✅ / Web ⬜) |

## Tables
- `labour_groups`: groups under Sardars with activity types (`making`, `loading`, `unloading`, `daily_wage`).
- `workers`: individual workers with group mapping and optional daily wage rates.
- `labour_attendance`: daily attendance records (`present`, `half_day`, `absent`, overtime).
- `labour_advances`: cash/bank advances linked to Sardar and payment vouchers (`PMT`).
- `labour_deductions`: khurak (food/ration), loan instalments, advance recoveries, and fines.
- `labour_settlements`: end-of-season wage calculation (`gross_wages - advances_recovered - deductions = net_payable`).
- `labour_wage_rates`: company-level rates per activity and unit.

## Endpoints
- `POST /labour/groups` · `GET /labour/groups` · `PATCH /labour/groups/:id`
- `POST /labour/workers` · `GET /labour/workers` · `PATCH /labour/workers/:id`
- `POST /labour/attendance` (Idempotency-Key) · `GET /labour/attendance`
- `POST /labour/advances` (Idempotency-Key) · `GET /labour/advances`
- `GET /labour/advances/exposure` & `GET /labour/exposure` (LEK-03 live calculation)
- `GET /labour/exposure-summary` (LEK-03 ranking report across all Sardars)
- `POST /labour/deductions` · `GET /labour/deductions`
- `POST /labour/accrue-wages` (Idempotency-Key, LAB-04 journal posting)
- `POST /labour/settlements` (Idempotency-Key, LAB-07 payout posting) · `GET /labour/settlements` · `GET /labour/settlements/:id`

## Postings
- **Wage accrual (LAB-04):** Debit `LABOUR_WAGES` (Direct Expense), Credit Sardar Party Ledger (`Labour Payables`).
- **Advance (LAB-05):** Debit Sardar Party Ledger, Credit Cash/Bank Ledger (`PMT` voucher).
- **Settlement payment (LAB-07):** Debit Sardar Party Ledger, Credit Cash/Bank Ledger (`PMT` voucher).
