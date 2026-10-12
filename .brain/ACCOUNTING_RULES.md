# ACCOUNTING RULES — posting matrix

Engine: `backend/src/accounting/posting.service.ts` — **built in P2.1b**. `post(manager, input)` asserts Σdebit = Σcredit > 0,
every line one-sided and non-negative, the FY exists and is unlocked, and every ledger belongs to the company. It takes the
caller's `EntityManager`, so the document and its journal commit together.

Error codes it raises (all `BusinessRuleException` → 422): `JOURNAL_UNBALANCED` · `JOURNAL_TOO_FEW_LINES` · `JOURNAL_EMPTY_LINE`
· `JOURNAL_LINE_BOTH_SIDES` · `JOURNAL_NEGATIVE_AMOUNT` · `JOURNAL_ZERO_VALUE` · `FY_NOT_FOUND` · `FY_LOCKED` ·
`LEDGER_NOT_IN_COMPANY` · `LEDGER_INACTIVE` · `VOUCHER_TYPE_UNKNOWN` · `VOUCHER_ALREADY_REVERSED` · `VOUCHER_IS_A_REVERSAL`.

Numbering: `PREFIX/FY/000001`, gapless per company + FY + type. A `voucher_sequences` row is taken with `SELECT … FOR UPDATE`
rather than a Postgres sequence — a sequence hands out a number before commit, so a rollback would leave a hole, and GST
invoice numbering cannot have holes. Verified under 8 concurrent posts.

Reversal: `reverse(manager, …)` mirrors every line onto the opposite side, dates **today** (not back into a reported period),
links `reversal_of_id`, and marks the original `reversed`. A reversal cannot itself be reversed.

## Voucher types
Receipt (RCT) · Payment (PMT) · Contra (CNT) · Journal (JNL) · Sales (SAL) · Purchase (PUR) · Credit Note (CRN) · Debit Note (DBN). Numbering per company + FY + type: `SAL/2026-27/000123`.

## Rules
- Posted vouchers immutable. Correction = reversal voucher (mirror lines) or credit/debit note. No hard delete.
- Every voucher line: ledger_id, debit, credit (one of them 0), optional party_id, kiln_id, narration.
- FY lock: no posting dated in a locked FY/period. Year-end carry-forward of balance-sheet ledgers (P10).
- Party ledgers live under Sundry Debtors / Sundry Creditors / Labour Payables groups.
- GST split: same state → CGST + SGST (rate/2 each); different state → IGST.

## Posting matrix (CP1)
| Event (phase) | Debit | Credit |
|---|---|---|
| Manual receipt (P2) | Cash / Bank | Party / Income |
| Manual payment (P2) | Party / Expense | Cash / Bank |
| Contra: deposit / withdraw / transfer (P2) | Bank / Cash / Bank B | Cash / Bank / Bank A |
| Opening balances (P2) | Assets / Debtors | Liabilities / Creditors / Capital (diff → Opening Balance Difference) |
| Supplier bill (P7) | Purchases / Stock / Expense + Input CGST/SGST/IGST | Supplier |
| Supplier payment (P7) | Supplier | Cash / Bank |
| Purchase return / debit note (P7) | Supplier | Purchases + Input GST |
| GST sales invoice (P8) | Customer | Sales – Bricks + Output CGST/SGST/IGST (+ Loading Income / Freight Income / Other Sales Income, split by charge kind — ADR-039) |
| Customer receipt (P8) | Cash / Bank | Customer (advisory lock stops concurrent overcollection) |
| Credit note (P8) | Sales Returns + Output CGST/SGST or IGST | Customer; stock IN via StockService in-tx if any line has qty > 0 (ADR-040) |
| Debit note (P8) | Customer | Sales – Bricks + Output CGST/SGST or IGST |
| Wage accrual from production/loading (P6) | Labour Wages expense | Sardar / Worker (Labour payable) |
| Advance to Sardar/worker (P6) | Labour Advances (asset) | Cash / Bank |
| Advance recovery at settlement (P6) | Sardar payable | Labour Advances |
| Wage payment (P6) | Sardar / Worker | Cash / Bank |
| Diesel / maintenance (P9) | Vehicle Diesel / Vehicle Repairs (vehicle tag) | Cash / Bank / Supplier |
| Freight income on trip (P9) | Customer | Freight Income |
| Hired vehicle charges (P9) | Freight Expense | Transporter |
| Expense entry (P10) | Expense ledger (kiln tag) | Cash / Bank / UPI-Bank / Supplier (credit) |
| Bank charges (P10) | Bank Charges | Bank |
| Closing stock (P10, method TBD) | Closing Stock (BS) | Closing Stock (P&L) |

Pure stock events (GRN without bill, production, dispatch, wastage) move **quantity** only; value enters via bills/invoices and period-end closing stock (see OPEN_QUESTIONS #4).

## Seeded chart of accounts (P2, Tally-style — confirm OQ #3)
Capital · Reserves & Surplus · Loans (Liability) · Current Liabilities (Sundry Creditors, Labour Payables, Duties & Taxes: Output/Input CGST/SGST/IGST) · Fixed Assets · Current Assets (Cash-in-hand, Bank Accounts, Sundry Debtors, Labour Advances, Stock-in-hand, Deposits) · Sales Accounts · Purchase Accounts · Direct Income · Indirect Income · Direct Expenses (Labour Wages, Coal, Soil, Electricity, Loading/Unloading) · Indirect Expenses (Repairs, Salary, Rent, Office, Bank Charges, Govt Charges, Misc).
