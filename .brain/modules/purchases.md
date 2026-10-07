# M07 Purchases

**Purpose:** PO → GRN → supplier bill (GST input) → stock → payment; returns; payables ageing.
**Phase:** P7 · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| PUR-01 | Purchase order | P7 | ⬜ |
| PUR-02 | GRN (goods receipt) on web + mobile offline → stock in | P7 | ⬜ |
| PUR-03 | Supplier bill / purchase voucher with GST input (CGST/SGST/IGST), linked to GRN | P7 | ⬜ |
| PUR-04 | Supplier payment (cash/bank/UPI) with bill-wise settlement | P7 | ⬜ |
| PUR-05 | Purchase return / debit note | P7 | ⬜ |
| PUR-06 | Payables outstanding with ageing | P7 | ⬜ |

## Tables (planned)
purchase_orders(+items), grns(+items), purchase_bills(+items), purchase_returns

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: PO, GRN, bills, payments, payables ageing. Mobile: GRN.

## Postings
Bill Dr Purchases/Expense + Input GST Cr Supplier; payment Dr Supplier Cr Cash/Bank; debit note.

## Known gaps / notes
-
