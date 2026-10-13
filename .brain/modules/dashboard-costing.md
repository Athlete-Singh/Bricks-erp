# Dashboard, Costing & Reports

**Purpose:** Owner KPIs for the Key Management Questions, monthly charts, cost per 1,000 bricks, gross margin, exports.
**Phase:** P11 · **Status:** 🧩 backend ✅ (P11.1), web ⬜ (P11.2)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| DSH-01 | Owner dashboard answering the "Key Management Questions": production today/month/year, stock, sold/dispatched, receivables, payables, labour payable, coal/diesel used, expenses, estimated profit, cost per 1,000, gross margin | P11.1 | 🧩 backend only |
| DSH-02 | Monthly charts: production, sales, collection, expenses, fuel | P11.1 | 🧩 backend only |
| CST-01 | Cost per 1,000 bricks by kiln × month × brick type (labour, coal, soil, electricity, loading, repairs, other) vs ₹4,100 benchmark → gross margin | P11.1 | 🧩 backend only |
| RPT-01 | Excel/PDF export for the main reports | P11.2 | ⬜ |
| RPT-02 | Daily operations report | P11.2 | ⬜ |
| RPT-03 | Sales register by customer / brick type / period | P11.2 | ⬜ |
| RPT-04 | Labour registers: attendance + wage by Sardar / group / period | P11.2 | ⬜ |

## Tables
None — the module reads only. Every number is derived from what the other
modules already posted (production entries, sales invoices, dispatches,
expenses, voucher lines).

## Endpoints
| Method | Path | Who | Purpose |
|---|---|---|---|
| GET | `/dashboard/summary` | `accounts.view` | DSH-01 — the Key Management Questions in one call |
| GET | `/dashboard/monthly` | `accounts.view` | DSH-02 — rolling monthly series for the trend charts |
| GET | `/reports/cost-per-1000` | `accounts.view` | CST-01 — kiln × month × brick-type cost allocation vs ₹4,100 |

## Screens
Web (P11.2): owner dashboard, costing report, daily/sales/labour registers with exports.

## Costing method (ADR-049)
- A kiln fires all brick grades in the same chamber, so direct expense ledgers
  are not tagged to a brick type. CST-01 allocates each site-month's seven
  cost buckets (labour, coal, soil, electricity, loading, repairs, other) by
  that brick type's share of the sorted good output for that kiln-month.
- Labour reads **the LABOUR_WAGES ledger** rather than wage accruals so a
  manual journal (used by LAB-04 under the hood) and an accrual both show up.
- Coal and diesel usage read as DR on the `COAL` / `VEHICLE_DIESEL` ledgers,
  independent of whether the fuel was issued from the kiln's own stock
  (ADR-043 — no journal, stock only) or bought at a pump (journal, no stock).

## Benchmark
₹4,100 per 1,000 bricks, from Proposal §4 / Spec §22. Hardcoded for CP1 as
`COST_PER_THOUSAND_BENCHMARK` in `@brics/shared`. **CP2 candidate:** per-company
override on the company settings screen.

## Honest "unknown"
A window with no fired bricks returns `null` for cost-per-1,000 and gross
margin, not `0` or `∞`. Same discipline as ADR-029 (unknown is a different
claim from "it was free") and ADR-046 (unvalued stock is reported, not
treated as worthless).

## Postings
None — the module reads only.

## Known gaps / notes
- `/dashboard/summary` and `/dashboard/monthly` currently exclude vouchers that
  carry no `site_id` from any site filter — unassigned overheads are company-
  wide only. Trade-off: a kiln filter must mean kiln-only; the user sees them
  on the company-wide read.
- Opening balances on party ledgers are stored on the ledger entity but not
  posted as a voucher. The dashboard reads voucher lines, so an unposted
  opening balance does not count toward receivables / payables / labour
  payable here. Known gap carried from P10; the opening-balance posting ADR
  will fix all three readers at once.
