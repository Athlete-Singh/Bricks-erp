# M10 Accounting

> Status: **Planned (not started)** · Build phase: P2 → P10
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Chart of accounts, posting engine, vouchers, opening balances, books, TB, P&L, BS, FY lock.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| ACC-01 | Chart of accounts + ledger groups (seeded Indian default, editable) | P2 | ⬜ |
| ACC-02 | Posting engine: balanced, atomic, immutable, reversal | P2 | ⬜ |
| ACC-03 | Manual vouchers: receipt, payment, contra, journal | P2 | ⬜ |
| ACC-04 | Opening balances for ledgers | P2 | ⬜ |
| ACC-05 | Day Book, Ledger, Trial Balance | P2 | ⬜ |
| ACC-06 | Sales & purchase vouchers auto-posted from documents; debit/credit notes | P7/P8 | ⬜ |
| ACC-07 | Cash Book, Bank Book | P10 | ⬜ |
| ACC-08 | Profit & Loss, Balance Sheet (closing stock valuation method: see open questions) | P10 | ⬜ |
| ACC-09 | Receivables & payables summary reports | P10 | ⬜ |
| ACC-10 | Financial year lock and year-end carry-forward of balances | P10 | ⬜ |

## Data
Planned tables: ledger_groups, ledgers, voucher_types, vouchers, voucher_lines

## Screens
Web: CoA, voucher entry (keyboard), Day Book, Ledger, TB, Cash/Bank book, P&L, BS.

## Accounting effect
See ACCOUNTING_RULES.md.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
