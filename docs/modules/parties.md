# M02 Party Masters

> Status: **Planned (not started)** · Build phase: P3
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
One party master (customer, supplier, Sardar, transporter, employee, other) with auto ledger and statement.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| PTY-01 | One party master with types: customer, supplier, Sardar/labour contractor, transporter, employee, other | P3 | ⬜ |
| PTY-02 | GSTIN, PAN, state, address, phone, opening balance (Dr/Cr) per party | P3 | ⬜ |
| PTY-03 | Every party auto-gets a ledger account in the right group | P3 | ⬜ |
| PTY-04 | Party ledger statement, outstanding balance and transaction history (fills in as modules post) | P3 | ⬜ |

## Data
Planned tables: parties

## Screens
Web: party list/form, party ledger statement, outstanding.

## Accounting effect
Party creation → ledger under Sundry Debtors/Creditors/Labour Payables. Opening balance → opening JNL.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
