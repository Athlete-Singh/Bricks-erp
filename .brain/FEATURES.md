# FEATURES — Requirement Register & Status

> Source: BRICS_MASTER_PROMPT.md §11 (from the 3 client PDFs). One row per feature. Update **Status** at the end of every session.
> Columns BE / Web / Mob / Tests = per-app progress: ⬜ not started · 🟨 in progress · 🧩 built but **not connected** (UI without live API, or API no app uses yet) · ✅ done + connected · — not applicable.
> **Status** = overall; ✅ only when every applicable column is ✅. Endpoint-level wiring lives in `API_INDEX.md`.
> After editing, run `pnpm status` to regenerate `docs/13-roadmap-and-status.md` and the summary below.
> Legend: ⬜ Not started · 🟨 In progress · ✅ Done (built+tested+documented) · ⚠️ Partial/blocked · ⏭️ Deferred to CP2
> Rule: in CP1 build exactly this depth. Extra ideas → "CP2 candidates" at the bottom, not code.

## Summary (update every session)

| | Total | ✅ | 🟨 | ⚠️ | ⬜ | ⏭️ |
|---|---|---|---|---|---|---|
| CP1 MVP | 101 | 85 | 6 | 1 | 9 | 0 |
| CP2 Advanced | 10 | 0 | 0 | 0 | 0 | 10 |
| S — SaaS platform | 11 | 9 | 1 | 0 | 0 | 1 |

**CP1 done: 84 %** (85 of 101 features ✅)

### Per app

| App (CP1 features where it applies) | Applies to | ✅ done | 🧩 not connected | 🟨 in progress | ⚠️ blocked | ⬜ not started |
|---|---|---|---|---|---|---|
| Backend | 97 | 91 | 0 | 0 | 0 | 6 |
| Web | 94 | 88 | 0 | 0 | 0 | 6 |
| Mobile | 11 | 0 | 0 | 0 | 0 | 11 |
| Tests | 101 | 91 | 0 | 0 | 0 | 10 |

## Client Phase 1 — MVP

### M01 Company, Auth & RBAC (SOW #1)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ADM-01 | Company profile: name, address, state (for place of supply), GSTIN, PAN, logo | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | Backend + web complete: profile view/edit at /settings/company, tenant-scoped and audited |
| ADM-02 | Multiple companies under one login + company switcher | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | `POST /auth/switch-company` + topbar switcher (hidden when the user has one company) |
| ADM-03 | Multiple kilns/chimneys/sites per company (site type: kiln / branch / depot) + kiln switcher | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | Kiln list/create at /settings/kilns + topbar kiln switcher writing `activeSiteId` |
| ADM-04 | Financial years (April–March default): create, set active | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | Create + set-active at /settings/financial-years; overlap rejected, one active FY enforced in the DB |
| ADM-05 | Users: login (email or mobile + password), JWT access/refresh, logout, change password | CP1 | P1 | ✅ | ✅ | ⬜ | ✅ | 🟨 | Backend + web done (login, silent refresh, guard, logout, change-password). Mobile in M1 |
| ADM-06 | 9 seeded roles with default permission sets; Owner assigns role + kiln access per user | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | 9 roles seeded; user create + role/kiln reassignment at /settings/users |
| ADM-07 | Audit log (who / what / when / before-after) on financial + stock data; simple viewer for Owner | CP1 | P1 | ✅ | ✅ | — | ✅ | ✅ | AuditService writes on every company/kiln/FY/user/auth change; filtered, paged viewer at /audit-logs |


| ADM-08 | Company bank accounts (as Bank ledgers) | CP1 | P2 | ✅ | ⬜ | — | ✅ | 🟨 | `POST /ledgers` creates one under Bank Accounts; **no web screen calls it**, so an owner cannot add their bank in the app. Blocks go-live — expenses and receipts need a bank ledger to pay from |
| ADM-09 | Backups via managed DB (Supabase daily backups) + documented restore procedure | CP1 | P13 | ⬜ | — | — | ⬜ | ⬜ |  |

### M02 Party Masters (SOW #2)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| PTY-01 | One party master with types: customer, supplier, Sardar/labour contractor, transporter, employee, other | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| PTY-02 | GSTIN, PAN, state, address, phone, opening balance (Dr/Cr) per party | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| PTY-03 | Every party auto-gets a ledger account in the right group | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| PTY-04 | Party ledger statement, outstanding balance and transaction history (fills in as modules post) | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |

### M03 Production (SOW #3)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3) | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ | Each grade names the item it is stocked and sold as (ADR-051) |
| PRD-02 | Production batch per kiln + chamber + date | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| PRD-06 | Production entry on mobile (offline) | CP1 | P5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| PRD-07 | Production report: day / month / year by kiln and grade | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |

### M04 Labour & Sardar Engine (SOW #4)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| LAB-01 | Labour groups under a Sardar; worker master | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Labour groups & worker roster with group/activity/site assignment |
| LAB-02 | Daily attendance by group/worker (web + mobile offline) | CP1 | P6 | ✅ | ✅ | ⬜ | ✅ | 🟨 | Web muster roll register + mobile pending M3 |
| LAB-03 | Wage-rate config: piece rate per 1,000 bricks by activity (making, loading, unloading) and daily wage | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ |  |
| LAB-04 | Auto wage entries from production and loading counts | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Accrue wages modal + auto wage entry from production |
| LAB-05 | Cash advances and loans to Sardar/workers (cash/bank/UPI) | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Advances register with live LEK-03 exposure check & payment voucher posting |
| LAB-06 | Deductions: advance recovery, loan instalment, **food/ration (khurak), fines and penalties** | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Deductions register & dialog for khurak, loans, recoveries, fines |
| LAB-07 | Wage payment and seasonal settlement statement (earned − advances − deductions = payable) | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Seasonal settlements register & calculation dialog with optional payment voucher |
| LAB-08 | Labour ledger and outstanding per Sardar/worker | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Party ledger statements cover Sardar accounts |

### M05 Inventory (SOW #5)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| INV-01 | Items master: raw materials (soil, coal, sand, diesel), consumables, machinery/electrical/repair items; units; HSN | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| INV-02 | Warehouses / stock locations per kiln | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| INV-03 | Opening stock entry | CP1 | P4 | ✅ | ✅ | — | ✅ | ✅ |  |
| INV-04 | Stock movement ledger via a single `StockService` (every in/out linked to its source document) | CP1 | P4 | ✅ | ✅ | — | ✅ | ✅ | One balance per item per warehouse; a grade's movements carry its item (ADR-051) |
| INV-05 | Automatic updates from GRN, production, dispatch and wastage (wired in P5/P7/P9) | CP1 | P4 | ✅ | ✅ | — | ✅ | ✅ | Row was stale — shipped with P5 (sorting/wastage), P7 (GRN, returns) and P9 (challan). Every one goes through `StockService` |
| INV-06 | Manual stock adjustment with reason (restricted role) | CP1 | P4 | ✅ | ✅ | — | ✅ | ✅ |  |
| INV-07 | Stock reports: current stock by kiln/grade/item, movement register, Opening + Production + Purchase − Sales − Wastage = Closing | CP1 | P4 | ✅ | ✅ | — | ✅ | ✅ |  |

### M06 Vehicle & Transport (SOW #6)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| VEH-01 | Vehicles (own/hired; truck/tractor/tipper) and drivers | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-02 | Trip log: vehicle, driver, route, linked dispatch, freight income | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-03 | Diesel entries per vehicle/trip | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-04 | Maintenance/repair expense per vehicle | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-05 | Loading/unloading fees per trip (linked to labour wages) | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-06 | Hired vehicle / transporter charges payable | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| VEH-07 | Vehicle-wise profitability report (income − diesel − maintenance − driver/hire cost) | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |

### M07 Purchases (SOW #7)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| PUR-01 | Purchase order | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |
| PUR-02 | GRN (goods receipt) on web + mobile offline → stock in | CP1 | P7 | ✅ | ✅ | ⬜ | ✅ | 🟨 |  |
| PUR-03 | Supplier bill / purchase voucher with GST input (CGST/SGST/IGST), linked to GRN | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |
| PUR-04 | Supplier payment (cash/bank/UPI) with bill-wise settlement | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |
| PUR-05 | Purchase return / debit note | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |
| PUR-06 | Payables outstanding with ageing | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |

### M08 Sales & Invoicing (SOW #8)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| SAL-01 | Quotation | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | status machine, GST per line |
| SAL-02 | Sales order | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | optional convert-from-quote |
| SAL-03 | GST tax invoice: brick type, qty, rate per 1,000, discount, loading & transport charges, HSN, GST | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | stock OUT + journal in one tx (ADR-038); composite charges (OQ #17) |
| SAL-04 | Invoice PDF (A4, GST-compliant format) | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | pdfmake (OQ #18); Rule 46 fields incl. amount in words |
| SAL-05 | Customer receipt with bill-wise allocation | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | advisory-lock protects against concurrent overcollection |
| SAL-06 | Credit / debit notes | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | data-driven re-stock (OQ #19); GST split mirrored on reversal |
| SAL-07 | Receivables outstanding with ageing; customer ledger | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | buckets 0/1-30/31-60/61-90/90+; `asOf` honours past dates |

### M09 Dispatch & Delivery (SOW #9)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| DSP-01 | Dispatch / delivery challan: customer, invoice or SO, vehicle, driver, brick type/qty, loading group, loading & delivery location, date/time | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| DSP-02 | Confirm dispatch → finished stock deducted automatically | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| DSP-03 | Delivery status + acknowledgement (receiver name, time, remarks) | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |
| DSP-04 | Dispatch challan + delivery update on mobile (offline) | CP1 | P9 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Backend creates accept `Idempotency-Key`; app is M5 |
| DSP-05 | Challan PDF | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ |  |

### M10 Accounting (SOW #10)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ACC-01 | Chart of accounts + ledger groups (seeded Indian default, editable) | CP1 | P2 | ✅ | ✅ | — | ✅ | ✅ | Seeded per company at creation. Web: chart list with group and opening balance |
| ACC-02 | Posting engine: balanced, atomic, immutable, reversal | CP1 | P2 | ✅ | ✅ | — | ✅ | ✅ | `PostingService` — balanced, FY-gated, caller's transaction. Reversal from the Day Book, never an edit |
| ACC-03 | Manual vouchers: receipt, payment, contra, journal | CP1 | P2 | ✅ | ✅ | — | ✅ | ✅ | Receipt/payment/contra/journal with a live Dr/Cr total that blocks posting until it balances |
| ACC-04 | Opening balances for ledgers | CP1 | P2 | ✅ | ✅ | — | ✅ | ✅ | Opening Dr/Cr per ledger, transactional. Deliberately accepts an unbalanced set and reports the difference — real opening figures rarely tie first time. Entered through ONB-01's import (P13.3); an `OWNERS_CAPITAL` ledger was added so the other side has somewhere to go |
| ACC-05 | Day Book, Ledger, Trial Balance | CP1 | P2 | ✅ | ✅ | — | ✅ | ✅ | Day Book, Ledger statement with running balance, Trial Balance with Σ Dr = Σ Cr and the difference surfaced |
| ACC-06 | Sales & purchase vouchers auto-posted from documents; debit/credit notes | CP1 | P7/P8 | ✅ | ✅ | — | ✅ | ✅ | Row was stale — purchase bills and payments (P7), invoices, receipts and both note kinds (P8), all through `PostingService` |
| ACC-07 | Cash Book, Bank Book | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| ACC-08 | Profit & Loss, Balance Sheet (closing stock valuation method: see open questions) | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| ACC-09 | Receivables & payables summary reports | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| ACC-10 | Financial year lock and year-end carry-forward of balances | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |

### M11 GST Engine (SOW #11)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| GST-01 | HSN/SAC master + GST rate config (configurable; clay building bricks usually HSN 6904, confirm with the client's CA) | CP1 | P3 | ✅ | ✅ | — | ✅ | ✅ |  |
| GST-02 | CGST+SGST vs IGST by place of supply | CP1 | P8 | ✅ | ✅ | — | ✅ | ✅ | Enforced on invoices, credit and debit notes and supplier bills: the party's state against the company's decides it, and the wrong pair is refused with `GST_PLACE_OF_SUPPLY_MISMATCH`. A party with no state is intra-state — for an unregistered buyer the place of supply is the kiln. The forms offer only the side that applies |
| GST-03 | GST input on purchases | CP1 | P7 | ✅ | ✅ | — | ✅ | ✅ |  |
| GST-04 | GSTR-1 register (B2B, B2C, HSN summary) with Excel export | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| GST-05 | GSTR-3B summary register | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| GST-06 | GST sales and purchase reports | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| GST-07 | GST reconciliation: books vs what was filed — GSTR-1 register against the sales register, GSTR-3B against the books, with the differences listed | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ | Proposal §1 names "delayed GST reconciliation" as a problem BRICS solves. GST-04/05 produce registers; nothing reconciles them |

### M13 Leakage Control — the ROI module (Proposal §1 + §4, Functional Spec §21)

> **Why this is CP1:** the client bought BRICS to stop leakage (Proposal §1) and the ₹3.5–6 L/season claim (§4) rests on it.
> Every row below is a *report over data CP1 already captures* — no new tables, no new data entry. Each ships **with the module
> that produces its data**, not bundled at the end, so the owner sees value from P5 onward. Moved out of CP2 (was ADV-05).

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| LEK-01 | Brick yield variance: green moulded − (good + broken + rejects) per batch / chamber / Sardar gang, with an "unexplained" column | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| LEK-02 | Coal consumption per 1,000 bricks fired, compared batch-to-batch, kiln-to-kiln and month-to-month; outliers flagged | CP1 | P5 | ✅ | ✅ | — | ✅ | ✅ | |
| LEK-03 | Live Sardar advance exposure: advances drawn − wages earned to date, per Sardar; **warning shown at the moment a new advance is entered** | CP1 | P6 | ✅ | ✅ | — | ✅ | ✅ | Live Sardar advance exposure monitor dashboard & real-time modal warning |
| LEK-04 | Gate reconciliation: dispatched qty vs invoiced qty vs stock movement, with unmatched dispatches listed | CP1 | P9 | ✅ | ✅ | — | ✅ | ✅ | Catches trucks leaving without a bill |

### M14 Sync & idempotency (backend only — no Flutter needed)

> The mobile app is built later on another machine, but these backend decisions must be made **when each module is built**,
> or every mobile-facing endpoint has to be reopened afterwards. See `CONVENTIONS.md` → "Mobile-used create endpoints".

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| SYN-01 | `Idempotency-Key` header on every mobile-facing create endpoint + `idempotency_keys` table; a repeat with the same key returns the original result instead of creating a duplicate | CP1 | P5 | ✅ | — | — | ✅ | 🟨 | P5.1c — BE done on all 5 production POSTs; applies to P6/P7/P9 as those modules ship |
| SYN-02 | Delta pull endpoints (`?since=`) for the masters the app caches: kilns, parties, items, brick types, wage rates | CP1 | P5 | ✅ | — | — | ✅ | 🟨 | P5.1c — BE on all 5 masters; tombstones carry `deleted: true` |

### M12 Supervisor Mobile App (SOW #12)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| MOB-01 | Login, kiln selection, role-based home | CP1 | M1 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ | Handle a **suspended tenant** at sign-in (PLT-06): say the company's access is on hold and who to contact, not "login failed" |
| MOB-02 | Offline storage + sync queue + sync status badge (skeleton) | CP1 | M1 | — | — | ⬜ | ⬜ | ⬜ |  |
| MOB-03 | Feature screens: production, attendance, GRN, dispatch/delivery | CP1 | M2–M5 | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |  |
| MOB-04 | A full working day offline; syncs with no duplicates; conflict handling | CP1 | M6 | — | — | ⬜ | ⬜ | ⬜ |  |
| MOB-05 | Android release APK | CP1 | M6 | — | — | ⬜ | ⬜ | ⬜ |  |
| MOB-06 | iOS build + TestFlight/App Store release | CP1 | M6 | — | — | ⬜ | ⬜ | ⬜ | **Contracted:** SOW §1 says "Cross-platform iOS & Android"; §3 excludes only the Apple $99/yr fee. Was wrongly filed under "CP2 candidates" |

### S — SaaS platform (the vendor's own surface, not a kiln's)

Outside CP1: this is what selling BRICS needs, not what a kiln uses. Design and
reasoning in `.brain/modules/saas-platform.md`, decision in ADR-052.

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| PLT-01 | Tenant record: `status` (trial/active/suspended), plan name, trial end, last active | S | S1.1 | ✅ | — | — | ✅ | ✅ |  |
| PLT-02 | Platform permissions and a `platform_admin` role, holding **no** business permissions; the `isSuperAdmin` bypass in `RolesGuard` removed | S | S1.1 | ✅ | — | — | ✅ | ✅ | That one line is what makes the separation meaningless |
| PLT-03 | `/admin` — its own surface and navigation, no business menu | S | S1.2 | — | ✅ | — | ✅ | ✅ | The fastest way to make an admin behave like an owner is to show them an owner's screen |
| PLT-04 | Tenant list: metadata only — counts and dates, never money and never the client's own parties | S | S1.2 | ✅ | ✅ | — | ✅ | ✅ |  |
| PLT-05 | Onboarding: company + **first financial year** + owner user, in one transaction | S | S1.2 | ✅ | ✅ | — | ✅ | ✅ |  |
| PLT-06 | Suspend / reactivate a tenant; sign-in refused with a message naming who to contact | S | S1.2 | ✅ | ✅ | ⬜ | ✅ | 🟨 | Mobile still to come (M1) |
| PLT-07 | Support sessions: reason required, two hours, closes itself, business permissions scoped to one tenant | S | S2.2 | ✅ | ✅ | — | ✅ | ✅ | Backend shipped in S2.1. Web switch, banner countdown, history, open dialog shipped in S2.2 |
| PLT-08 | Audit rows marked `platform_support`; the owner sees that support looked, and why | S | S2.2 | ✅ | ✅ | — | ✅ | ✅ | Backend shipped in S2.1. Audit screen Support badge, reason tooltip, and support filter shipped in S2.2 |
| PLT-09 | Tenant detail: users and roles, counts, last activity, support session history | S | S3.1 | ✅ | ✅ | — | ✅ | ✅ | User roster, kilns/sites, document counts, last active, support history tab |
| PLT-10 | Per-tenant setting: *require my approval before support access* | S | S3.2 | ✅ | ✅ | — | ✅ | ✅ | Migration 1796000000000, 6-digit access code, temporary grant window, dialog gate |
| PLT-11 | Billing: plans, trial expiry, payment status, automatic suspension | S | S4 | ⏭️ | ⏭️ | — | ⏭️ | ⏭️ | Deferred until invoicing by hand hurts |

### Basics from the Functional Spec needed to run the business (CP1, basic depth)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| EXP-01 | Expense categories (labour, coal, diesel, electricity, vehicle, machinery, repairs, salary, food, rent, office, govt charges, bank charges, misc) | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| EXP-02 | Expense entry by kiln with payment mode Cash / Bank / UPI / Credit | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| CSH-01 | Opening/closing cash; cash receipts/payments; bank deposit, withdrawal and transfer (contra); bank charges; cheque no. / UPI ref on vouchers | CP1 | P10 | ✅ | ✅ | — | ✅ | ✅ |  |
| DSH-01 | Owner dashboard answering the "Key Management Questions": production today/month/year, stock, sold/dispatched, receivables, payables, labour payable, coal/diesel used, **expenses, estimated profit**, cost per 1,000, gross margin | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | P11.1 + P11.2 complete |
| DSH-02 | Monthly charts: production, sales, collection, expenses, fuel | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | P11.1 + P11.2 complete; 12-month SVG series on the dashboard |
| CST-01 | Cost per 1,000 bricks by kiln, month **and brick type** (labour, coal, soil, electricity, loading, repairs, other) vs selling price → gross margin. Shown against the ₹4,100 benchmark from the Proposal §4 / Spec §22 | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | ADR-049 pro-rate by fired share within kiln-month; price and margin read per grade since ADR-051 tied a grade to its item |
| RPT-01 | Excel/PDF export for the main reports | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | CSV export (ADR-048) on cost per 1,000, sales register and labour registers |
| RPT-02 | Daily operations report: one page per day — production, dispatch, sales, collection, expenses, coal used, labour present | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | `/reports/daily` + web daily page; coal is reported as quantity issued *and* as cost |
| RPT-03 | Sales register by customer / brick type / period, with quantity, rate per 1,000, discount, GST and total | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | `/reports/sales-register` + web page with customer / item / kiln filters and CSV export |
| RPT-04 | Labour registers: attendance register and wage register by Sardar / group / period | CP1 | P11 | ✅ | ✅ | — | ✅ | ✅ | `/reports/labour-register?kind=attendance\|wages` + web tabs with Sardar / group / kiln filters and CSV export |
| ONB-01 | Go-live onboarding: CSV import of parties, items, opening balances and opening stock (not historical transactions; those are excluded in the SOW) | CP1 | P13 | ✅ | ✅ | — | ✅ | ✅ | Check-then-import, all rows or none. CSV is parsed in the browser — nothing is uploaded. Opening balances also close the ACC-04 screen gap |
## Client Phase 2 — Advanced (do NOT build in CP1)

### From the SOW (Phase 2 column)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| AI-01 | AI anomaly: predictive coal efficiency + anomaly alerts (SOW #13) | CP2 | A5 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| IOT-01 | Weighbridge scale integration (SOW #14) | CP2 | A6 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| IOT-02 | Kiln thermal sensor integration (SOW #14) | CP2 | A6 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |

### In the Functional Spec V1 but beyond the SOW's MVP rows (proposed for CP2; confirm with the client)

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| ADV-01 | Bank reconciliation | CP2 | A1 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| ADV-02 | Cheque lifecycle (issued/deposited/cleared/bounced, post-dated cheques) | CP2 | A1 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| ADV-03 | Cash flow statement | CP2 | A1 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| ADV-04 | "Most profitable customer" analysis and ranked comparisons | CP2 | A3 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | Kiln / month / **brick type** comparison moved into CP1's CST-01; customer-level profitability stays CP2 |
| ADV-05 | Advanced leakage analytics: cross-module cash leakage, trend/seasonality, ranked alerts | CP2 | A3 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ | **The core variance reports moved to CP1 as LEK-01…04.** What stays here is the analytics layer on top |
| ADV-06 | Custom role/permission matrix editor | CP2 | A4 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |
| ADV-07 | In-app backup/restore and full data export | CP2 | A4 | ⏭️ | ⏭️ | ⏭️ | ⏭️ | ⏭️ |  |

### Implied by the SOW — needs a client decision before CP1 is locked

| ID | Feature (build to this depth) | CP | Phase | BE | Web | Mob | Tests | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| NTF-01 | SMS/WhatsApp alerts (dispatch sent, payment received, advance limit crossed) via MSG91/Twilio | CP1 | P13 | ⬜ | ⬜ | — | ⬜ | ⚠️ | **Blocked on the client.** SOW §3 excludes the *gateway charges* "(paid directly to MSG91/Twilio)" — naming the vendors implies the integration itself is in scope. Was wrongly filed under "not in PDFs". See OPEN_QUESTIONS #14 |

## CP2 candidates (genuinely not in any client PDF — need client approval + quote)

- e-Invoice (IRN)
- e-Way Bill
- GSTR JSON upload format
- photo/signature proof of delivery
- Hindi/regional languages
- GPS vehicle tracking
- inter-kiln stock transfer
- _(add new ideas found during the build here, with date + who suggested)_

> **2026-10-08 — corrected.** "iOS App Store release" and "SMS/WhatsApp alerts" used to sit in this list under a heading that
> says *not in PDFs*. Both **are** in `03-sow-srs.pdf` (§1 "Cross-platform iOS & Android"; §3 excluding only the gateway *fees*).
> They are now MOB-06 and NTF-01 in CP1. Telling a client that contracted scope needs a fresh quote is how a dispute starts —
> check this list against the PDFs before quoting from it.
