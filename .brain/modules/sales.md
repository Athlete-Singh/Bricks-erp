# M08 Sales & Invoicing

**Purpose:** Quotation → SO → GST invoice (rate per 1,000, discount, loading, transport) → receipt; credit/debit notes; receivables ageing.
**Phase:** P8 · **Status:** ✅ complete (CP1 depth)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| SAL-01 | Quotation | P8 | ✅ |
| SAL-02 | Sales order | P8 | ✅ |
| SAL-03 | GST tax invoice: brick type, qty, rate per 1,000, discount, loading & transport charges, HSN, GST | P8 | ✅ |
| SAL-04 | Invoice PDF (A4, GST-compliant format) | P8 | ✅ |
| SAL-05 | Customer receipt with bill-wise allocation | P8 | ✅ |
| SAL-06 | Credit / debit notes | P8 | ✅ |
| SAL-07 | Receivables outstanding with ageing; customer ledger | P8 | ✅ |

## Tables
`quotations` + `quotation_lines` · `sales_orders` + `sales_order_lines` ·
`sales_invoices` + `sales_invoice_lines` · `sales_charges` (one table for
quote/SO/invoice charges, via `parent_type` + `parent_id`) ·
`customer_receipts` + `customer_receipt_allocations` ·
`credit_notes` + `credit_note_lines` · `debit_notes` + `debit_note_lines`.

All CHECK + unique + FK constraints are listed in DB_SCHEMA.md; the one-GST-kind
rule (`chk_*_one_gst_kind`) and the total-is-sum rule (`chk_*_total_is_sum`)
are present on every money-bearing table so a bad migration cannot silently
drop them (the P3 lesson).

## Endpoints
See `API_INDEX.md` for the full list with wiring — 16 routes under `/sales/*`:
quotations (list / get / create / status change), orders (same + cancel),
invoices (list / get / create / PDF), receipts (list / create), credit notes
(list / create), debit notes (list / create), receivables ageing.

## Screens
Web: `/sales/quotations`, `/sales/orders`, `/sales/invoices` (list + per-row
PDF button that fetches the authenticated blob and opens in a new tab),
`/sales/receipts` (bill-wise allocation table filtered to the customer's open
invoices), `/sales/notes` (credit + debit notes on one page), `/sales/receivables`.

The invoice form carries lines (item, warehouse, qty, rate, discount, GST per
line, HSN) and separate loading / transport / other charges (composite supply,
same GST as the brick line — OQ #17). The receipt form picks only invoices
with something outstanding and refuses to allocate more than that.

## Postings (full matrix in ACCOUNTING_RULES.md)
- **GST sales invoice** (P8) — Dr Customer; Cr Sales — Bricks (for brick
  lines) + Loading Income / Freight Income / Other Sales Income (bucketed by
  charge kind) + Output CGST/SGST (intra-state) **or** Output IGST (inter-state).
- **Customer receipt** (P8) — Dr Cash / Bank; Cr Customer; invoice
  `paid_amount` incremented under an advisory lock so concurrent receipts
  cannot overcollect.
- **Credit note** (P8) — Dr Sales Returns + Output CGST/SGST (or Output IGST);
  Cr Customer. When any line carries `quantity > 0` a stock IN also fires via
  `StockService` in the same transaction (data-driven re-stock, OQ #19).
- **Debit note** (P8) — Dr Customer; Cr Sales — Bricks + Output CGST/SGST
  (or Output IGST).

## Non-obvious correctness guards
- Invoice issue runs the stock OUT via `StockService` in the same transaction
  as `PostingService.post()`. If the yard would go negative (ADR-026) the
  whole invoice rolls back and the voucher number is not consumed.
- Advisory lock keyed on `customer-receipt:${companyId}:${customerPartyId}`
  stops the read-then-write race on an invoice's `paid_amount` (ADR-027).
- `assertNotFuture` on invoice / receipt / note dates (ADR-028).
- `SAL/FY/######` is a single gapless series, user-visible on the PDF, and
  the same number as the journal voucher (OQ #16).
- Idempotency-Key honoured on all five create endpoints.

## Known gaps / notes
- No invoice reversal endpoint. Correction is a credit note.
- Loading / transport charge income splits into three ledgers (Loading,
  Freight, Other Sales). The migration backfills the two new ones onto
  companies that predate P8.
- CP2 candidate: brick-type lines (currently invoice references `items`,
  which is adequate for CP1 but makes grade-wise sales reporting lossy).
