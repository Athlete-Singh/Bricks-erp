# M02 Party Masters

**Purpose:** One party master (customer, supplier, Sardar, transporter, employee, other) with auto ledger and statement.
**Phase:** P3 · **Status:** 🟨 backend done, web not started

## Features
| ID | Feature | Phase | BE | Web | Tests | Status |
|---|---|---|---|---|---|---|
| PTY-01 | One party master with types: customer, supplier, Sardar/labour contractor, transporter, employee, other | P3 | ✅ | ⬜ | ✅ | 🟨 |
| PTY-02 | GSTIN, PAN, state, address, phone, opening balance (Dr/Cr) per party | P3 | ✅ | ⬜ | ✅ | 🟨 |
| PTY-03 | Every party auto-gets a ledger account in the right group | P3 | ✅ | ⬜ | ✅ | 🟨 |
| PTY-04 | Party ledger statement, outstanding balance and transaction history (fills in as modules post) | P3 | ⬜ | ⬜ | ⬜ | ⬜ |

## Tables
`parties` — `party_types[]` text array, gstin, pan, state_code, address, phone, email, opening_debit/credit (NUMERIC 18,2), ledger_id (FK → ledgers, unique), is_active. Soft-delete. Migration `1700000400000-Parties`.

## Entity
`backend/src/modules/parties/entities/party.entity.ts` — extends `TenantBaseEntity`.

## Endpoints
| Method | Path | Permission | Note |
|---|---|---|---|
| POST | /parties | parties.manage | Creates party + auto-ledger in one transaction |
| GET | /parties | parties.view | Paginated, with search/type/isActive filters and sort |
| GET | /parties/:id | parties.view | Single party by id, tenant-scoped |
| PATCH | /parties/:id | parties.manage | Updates party; syncs ledger name/group on change |

## Auto-ledger logic (ADR-020)
Type precedence: customer → Sundry Debtors, supplier/transporter → Sundry Creditors, sardar/employee → Labour Payables, other → Sundry Creditors. Multi-type party uses highest precedence. Ledger and party created in one transaction; ledger.partyId ← party.id linked bidirectionally.

## Company GST scheme (ADR-019)
`companies.gst_scheme` column: `regular_12_itc` | `composition_6_no_itc`. Returned in login/switch/current responses. Default: `regular_12_itc`.

## Screens (planned)
Web: party list/form, party ledger statement, outstanding — P3.2.

## Known gaps / notes
- Opening balance posting not yet wired — the opening Dr/Cr fields are stored on the party and ledger but no opening JNL is posted. That lands when a dedicated "opening balance import" flow is built.
