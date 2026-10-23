# 18 — Acceptance test (UAT) script

For the kiln's own people to try BRICS on their real work before signing off
Client Phase 1. Each row is one thing to do and what should happen. Tick
**Pass** or write what happened instead under **Notes** — a screenshot helps.

**Who:** the owner (web), the accountant (web), one supervisor (phone app).
**Time:** about two working days, done alongside the normal paper records so
the two can be compared.
**Where:** the web address you were given, and the BRICS app on an Android
phone. Use real names and real quantities; this is a trial, but the numbers
should be ones you can check.

The user guide (docs/16) explains every screen named below.

---

## A. Setting up (owner, web)

| #   | Do this                                                                          | It should                                                       | Pass | Notes |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---- | ----- |
| A1  | Sign in with your mobile and password                                            | Open the Dashboard                                              | ☐    |       |
| A2  | Settings → Company: check name, GSTIN and state                                  | Save; the state shown is your kiln's state                      | ☐    |       |
| A3  | Settings → Financial years: check 2026-27 exists                                 | Show 1 Apr 2026 – 31 Mar 2027                                   | ☐    |       |
| A4  | Settings → Kilns: add or rename your kilns                                       | List every chimney you run                                      | ☐    |       |
| A5  | Accounts → Ledgers → Add bank account, for each bank account                     | Each appears under Ledgers with its opening balance             | ☐    |       |
| A6  | Settings → Users: add the accountant and one supervisor                          | Each can sign in; the supervisor cannot open Accounts           | ☐    |       |
| A7  | Settings → Go-live import: download the Parties template, fill 5 rows, **Check** | Show what would be added; nothing saved yet                     | ☐    |       |
| A8  | Same file with one row broken (e.g. a blank name), **Import**                    | Refuse the whole file and name the spreadsheet line             | ☐    |       |
| A9  | Fix the row and **Import**                                                       | All 5 parties appear under Masters → Parties                    | ☐    |       |
| A10 | Import opening stock for the yard                                                | Stock → Current stock shows the same numbers as your yard count | ☐    |       |

## B. The supervisor's phone

| #   | Do this                                                     | It should                                                                             | Pass | Notes |
| --- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---- | ----- |
| B1  | Install the app, sign in as the supervisor, choose the kiln | Show the home screen with Production, Attendance, Goods receipt, Dispatch             | ☐    |       |
| B2  | Production → New batch (chamber, today)                     | Show the batch with Making as the next stage                                          | ☐    |       |
| B3  | Record Making with the green brick count                    | Show "Recorded" once sent; the web shows the same count under Production → Batches    | ☐    |       |
| B4  | Turn on airplane mode. Record Firing on another batch       | Save on the phone; the badge says "1 waiting"                                         | ☐    |       |
| B5  | Turn airplane mode off                                      | Badge turns to "All sent" by itself within a minute                                   | ☐    |       |
| B6  | Attendance → Take attendance for one gang                   | Same roll visible on the web under Labour → Attendance                                | ☐    |       |
| B7  | Take attendance for the same gang and day again             | Badge says "1 need attention"; tapping it shows why, with Edit / Send again / Discard | ☐    |       |
| B8  | Goods receipt: coal from a supplier into the store          | A GRN number appears; web Stock → Current stock shows the coal                        | ☐    |       |
| B9  | Dispatch → New challan, then **Gate out**                   | The challan shows "Left the gate"; yard stock drops by that quantity                  | ☐    |       |
| B10 | Gate out a challan for more bricks than the yard has        | Refused: "Only N of … is in …" — stock never goes negative                            | ☐    |       |
| B11 | **Record delivery** with the receiver's name                | Challan shows "Delivered"                                                             | ☐    |       |
| B12 | Sign out with an entry still waiting                        | The app warns first                                                                   | ☐    |       |

## C. A working day (accountant, web)

| #   | Do this                                                     | It should                                                                  | Pass | Notes |
| --- | ----------------------------------------------------------- | -------------------------------------------------------------------------- | ---- | ----- |
| C1  | Purchases → Bills: the supplier's bill for the coal from B8 | Supplier's balance rises by the bill total                                 | ☐    |       |
| C2  | Purchases → Bills → Record payment: pay part                | Bill shows part-paid; the bank ledger drops                                | ☐    |       |
| C3  | Sales → Invoices: an in-state customer                      | Tax is CGST + SGST, and the screen says why                                | ☐    |       |
| C4  | Sales → Invoices: a customer from another state             | Tax is IGST                                                                | ☐    |       |
| C5  | Try to charge CGST + SGST to the out-of-state customer      | Refused — wrong tax for the place of supply                                | ☐    |       |
| C6  | Download the invoice PDF                                    | Shows GSTIN, HSN, tax split and totals in words; matches your paper format | ☐    |       |
| C7  | Sales → Receipts: part payment against the invoice          | Invoice shows what is still open                                           | ☐    |       |
| C8  | Sales → Credit / debit notes: 200 bricks returned to yard   | Customer balance and yard stock both adjust                                | ☐    |       |
| C9  | Labour → Advances: an advance to a Sardar                   | Sardar's balance shows it; a large one is warned about                     | ☐    |       |
| C10 | Labour → Settlements → Accrue wages: 1–15, then 10–20       | The second is refused — overlapping period                                 | ☐    |       |
| C11 | Reports → Expenses: diesel paid in cash                     | Cash & bank shows it with a running balance                                | ☐    |       |
| C12 | Enter something dated next year by mistake                  | Refused — future date                                                      | ☐    |       |

## D. What the owner reads

| #   | Do this                                    | It should                                                                                    | Pass | Notes |
| --- | ------------------------------------------ | -------------------------------------------------------------------------------------------- | ---- | ----- |
| D1  | Dashboard                                  | Production, stock, sales, collections and cost per 1,000 bricks match what you know happened | ☐    |       |
| D2  | Reports → Daily for today                  | Every entry from sections B and C is on it                                                   | ☐    |       |
| D3  | Dispatch → Gate report                     | Every truck that left; any not yet billed is counted at the top                              | ☐    |       |
| D4  | Accounts → Trial balance                   | Debit total = credit total                                                                   | ☐    |       |
| D5  | Reports → Statements (after pricing stock) | P&L and Balance Sheet; Balance Sheet balances                                                | ☐    |       |
| D6  | Reports → GST for this month               | Reconciliation, GSTR-1 and GSTR-3B; GSTR-1 downloads as CSV for your CA                      | ☐    |       |
| D7  | Reports → Cost per 1,000                   | By kiln, month and grade, with what each grade fetched                                       | ☐    |       |
| D8  | Audit log                                  | Shows who changed what in C1–C12, with before and after values                               | ☐    |       |

## E. Compare with paper

| #   | Check                                                    | Pass | Notes |
| --- | -------------------------------------------------------- | ---- | ----- |
| E1  | Yard stock in BRICS = physical count at the end of day 2 | ☐    |       |
| E2  | Cash in hand in BRICS = cash box at the end of day 2     | ☐    |       |
| E3  | Each customer's balance = your khata                     | ☐    |       |
| E4  | Each Sardar's advance balance = your register            | ☐    |       |

---

## Sign-off

Anything that failed is fixed and re-tested before sign-off. Something that works
but is not how you want it is noted as a change for later, not a failure.

| Role       | Name | Date | Signature |
| ---------- | ---- | ---- | --------- |
| Owner      |      |      |           |
| Accountant |      |      |           |
| Supervisor |      |      |           |
