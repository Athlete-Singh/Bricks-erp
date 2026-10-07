# 08 — Accounting engine

BRICS keeps **full double-entry books** like Tally, but most vouchers are created automatically by operations (invoice, bill, wage accrual, expense).

## Principles
1. Every financial event posts one **voucher** with lines where **Σ debit = Σ credit**.
2. The voucher is written **in the same DB transaction** as the business document. If posting fails, nothing is saved.
3. Posted vouchers are **immutable**. Mistakes are fixed by a reversal voucher or a credit/debit note.
4. Financial year April–March (configurable). Locked years/periods reject postings.
5. GST rates, HSN codes and wage rates are data, not code.

## Building blocks
- **Ledger groups** (tree, each with a nature: Asset / Liability / Income / Expense / Equity) → **Ledgers** (Cash, HDFC Bank, Ram Traders, Sales – Bricks, Output CGST…).
- Every **party** gets its own ledger automatically (customer → Sundry Debtors, supplier → Sundry Creditors, Sardar → Labour Payables).
- **Voucher types:** Receipt, Payment, Contra, Journal, Sales, Purchase, Credit Note, Debit Note. Numbered per company + FY + type (`SAL/2026-27/000123`).

## Posting matrix
See [`.brain/ACCOUNTING_RULES.md`](../.brain/ACCOUNTING_RULES.md) for the full Dr/Cr table. Example, GST invoice for 10,000 Class-1 bricks at ₹6,500 per 1,000, intra-state, 12% GST (example rate; the real rate is configured):

| Ledger | Dr | Cr |
|---|---|---|
| Customer (Sundry Debtors) | 72,800.00 | |
| Sales – Bricks | | 65,000.00 |
| Output CGST 6% | | 3,900.00 |
| Output SGST 6% | | 3,900.00 |

Inter-state → one line Output IGST 12% (7,800.00) instead of CGST + SGST. Place of supply = buyer's state (from GSTIN / address) vs company state.

## Reports (CP1)
Day Book · Ledger · Trial Balance (P2) · Cash Book · Bank Book · P&L · Balance Sheet · Receivables/Payables (P10) · GSTR-1 & GSTR-3B registers (P10). Cash flow statement and bank reconciliation are **Client Phase 2**.

## Closing stock
Stock quantities move with operations. Value for P&L/BS is set at period end (method to be confirmed, see OPEN_QUESTIONS #4).
