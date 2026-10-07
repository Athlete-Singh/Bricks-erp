# M08 Sales & Invoicing

> Status: **Planned (not started)** · Build phase: P8
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Quotation → SO → GST invoice (rate per 1,000, discount, loading, transport) → receipt; credit/debit notes; receivables ageing.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| SAL-01 | Quotation | P8 | ⬜ |
| SAL-02 | Sales order | P8 | ⬜ |
| SAL-03 | GST tax invoice: brick type, qty, rate per 1,000, discount, loading & transport charges, HSN, GST | P8 | ⬜ |
| SAL-04 | Invoice PDF (A4, GST-compliant format) | P8 | ⬜ |
| SAL-05 | Customer receipt with bill-wise allocation | P8 | ⬜ |
| SAL-06 | Credit / debit notes | P8 | ⬜ |
| SAL-07 | Receivables outstanding with ageing; customer ledger | P8 | ⬜ |

## Data
Planned tables: quotations, sales_orders, sales_invoices(+items), credit_notes, debit_notes, receipt_allocations

## Screens
Web: quotations, orders, invoices + PDF, receipts, notes, receivables ageing.

## Accounting effect
Invoice Dr Customer Cr Sales + Output GST; receipt; credit note.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
