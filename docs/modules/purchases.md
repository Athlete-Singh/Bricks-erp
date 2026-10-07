# M07 Purchases

> Status: **Planned (not started)** · Build phase: P7
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
PO → GRN → supplier bill (GST input) → stock → payment; returns; payables ageing.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| PUR-01 | Purchase order | P7 | ⬜ |
| PUR-02 | GRN (goods receipt) on web + mobile offline → stock in | P7 | ⬜ |
| PUR-03 | Supplier bill / purchase voucher with GST input (CGST/SGST/IGST), linked to GRN | P7 | ⬜ |
| PUR-04 | Supplier payment (cash/bank/UPI) with bill-wise settlement | P7 | ⬜ |
| PUR-05 | Purchase return / debit note | P7 | ⬜ |
| PUR-06 | Payables outstanding with ageing | P7 | ⬜ |

## Data
Planned tables: purchase_orders(+items), grns(+items), purchase_bills(+items), purchase_returns

## Screens
Web: PO, GRN, bills, payments, payables ageing. Mobile: GRN.

## Accounting effect
Bill Dr Purchases/Expense + Input GST Cr Supplier; payment Dr Supplier Cr Cash/Bank; debit note.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
