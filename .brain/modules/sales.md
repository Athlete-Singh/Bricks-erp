# M08 Sales & Invoicing

**Purpose:** Quotation → SO → GST invoice (rate per 1,000, discount, loading, transport) → receipt; credit/debit notes; receivables ageing.
**Phase:** P8 · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| SAL-01 | Quotation | P8 | ⬜ |
| SAL-02 | Sales order | P8 | ⬜ |
| SAL-03 | GST tax invoice: brick type, qty, rate per 1,000, discount, loading & transport charges, HSN, GST | P8 | ⬜ |
| SAL-04 | Invoice PDF (A4, GST-compliant format) | P8 | ⬜ |
| SAL-05 | Customer receipt with bill-wise allocation | P8 | ⬜ |
| SAL-06 | Credit / debit notes | P8 | ⬜ |
| SAL-07 | Receivables outstanding with ageing; customer ledger | P8 | ⬜ |

## Tables (planned)
quotations, sales_orders, sales_invoices(+items), credit_notes, debit_notes, receipt_allocations

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: quotations, orders, invoices + PDF, receipts, notes, receivables ageing.

## Postings
Invoice Dr Customer Cr Sales + Output GST; receipt; credit note.

## Known gaps / notes
-
