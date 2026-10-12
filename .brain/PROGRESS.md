# PROGRESS — live build tracker

**Client Phase:** CP1 (MVP) · **Current step:** P8.2 ✅ done — **phase P8 complete** → **next: P9** (dispatch & transport + LEK-04)
Legend: ⬜ · 🟨 · 🧩 · ✅ · ⚠️ · ⏭️ (see FEATURES.md)

## ▶ Resume here (update at end of EVERY session)
- **Last green gate:** P8 complete (2026-10-12). Gate green: lint ✓ typecheck ✓ test ✓ build ✓ · backend 143 unit + **476 e2e** (+50 for sales), web 113, shared 76. Schema integrity now covers 157 tenant tables.
- **What shipped (P8):** sales engine, SAL-01…07.
  - **Backend (P8.1a+b+c in one commit):** 13 new tables, 16 routes under `/sales/*`. Quotations with status machine (draft → sent → accepted/rejected/cancelled/expired). Sales orders (optional convert from quote). **GST tax invoice** that moves stock OUT via `StockService` and posts the journal via `PostingService` in **one transaction** (ADR-038); composite loading/transport/other charges split across three income ledgers (ADR-039). **Invoice PDF** rendered server-side with `pdfmake` (OQ #18), carrying every Rule 46 field including amount-in-words. Bill-wise customer receipts with an advisory lock against concurrent overcollection. Credit note that re-stocks if and only if the line carries a quantity (ADR-040); debit note mirror. Receivables ageing with the usual `asOf` + buckets (0/1-30/31-60/61-90/90+).
  - **Web (P8.2):** six-tab Sales section — quotations, orders, invoices (per-row PDF button that fetches with the in-memory Bearer token and opens via Blob URL), receipts (bill-wise allocation table auto-filtered to open invoices), credit + debit notes on one page, receivables dashboard.
  - **Shared:** `SALES_VIEW` + `SALES_MANAGE` added to the catalogue; Owner/Super Admin/Accountant/Manager/Sales Executive widened. `LOADING_INCOME` and `OTHER_SALES_INCOME` added to the chart of accounts, with a backfill in the migration so pre-P8 companies pick them up.
- **Next step (exact):** **P9 — dispatch & transport**: dispatch/challan linking an invoice, vehicle, driver, grade and loading group (DSP-01); confirm → finished stock deducted automatically (DSP-02 — though note that P8 already deducts stock at invoice issue, so P9 will revisit whether the dispatch acts on the invoice line or writes an additional movement, with a dedicated ADR); delivery acknowledgement (DSP-03); challan PDF (DSP-05); + **LEK-04 gate reconciliation**. M-track: SYN-01 already covers the mobile DSP flow in M5.
- **What shipped (P6.2) — kept for context:** Labour & Sardar Web Screens — **LAB-01…08, LEK-03**:
  - Full frontend module under `/labour` with 6 tab views:
    - `/labour/attendance`: Field-friendly muster roll register with status badges, filters, and batch entry dialog (`AttendanceRegisterDialog`) featuring high-contrast $\ge 44\text{px}$ touch buttons (`Present`, `Half Day`, `Absent`) and overtime tracking.
    - `/labour/advances`: Advances register with period summary card and `AdvanceDialog` featuring real-time **LEK-03** exposure detection card and server warning banner.
    - `/labour/groups`: Dual-section management for Labour Gangs (with Sardar and activity linking) and Worker Master roster.
    - `/labour/deductions`: Register for Khurak (rations), loan instalments, advance recoveries, and fines with `DeductionDialog`.
    - `/labour/settlements`: Seasonal settlement statements with gross wages, advances recovered, deductions, and net payable. `AccrueWagesDialog` (LAB-04 journal posting) and `SettlementDialog` (LAB-07 settlement with immediate cash/bank payout option). `SettlementDetailDialog` statement modal.
    - `/labour/exposure`: Dedicated LEK-03 Live Sardar Advance Exposure Monitor dashboard ranking Sardars by net exposure risk, filterable by kiln and unsecured-only toggle.
  - Active Labour navigation in sidebar (`PERMISSIONS.LABOUR_VIEW`), removing `comingIn: 'P6'`.
  - Comprehensive unit test suite in `web/src/features/labour/__tests__/labour.test.tsx` verifying dashboard, tables, badges, and LEK-03 warnings.
- **INV-05 is being wired across P5/P7/P8/P9** — P5.1a added sorting IN (first instance), P5.1b added the firing/making OUT, P7 added GRN IN and purchase-return OUT, P8 added sales-invoice OUT and credit-note IN; P9 adds dispatch OUT (TBD whether as a second movement or a reclassification of the invoice-time OUT).
- **Still open:** opening balance posting — a party's Dr/Cr is stored on the party and its ledger, but no opening journal is written, so the Trial Balance shows it as a difference. Deferred to a dedicated import flow.
- **Still open: production stage reversal.** A posted stage entry is immutable (correct) but there is **no reversal endpoint or UI** to correct one — a sorting entry has already written stock IN per grade, and firing/making have written consumption OUT, so an undo must reverse those movements too. The duplicate-stage error now says to use a stock adjustment instead; a proper reversal (like `POST /vouchers/:id/reverse`) is a dedicated step for after P6/P7, once dispatch and purchases have had the same pattern repeated enough times to justify a shared `ReversalService`.

### First run on a fresh database
`pnpm db:up` → `pnpm --filter @brics/backend migration:run` → set `SEED_OWNER_MOBILE` + `SEED_OWNER_PASSWORD` in `backend/.env` → `pnpm seed`.
That creates the 9 roles, one company, one kiln and one Owner. The bootstrap refuses to run if any user already exists.
- **Done:**
  - P5.1c ✅ **SYN-01 idempotency + SYN-02 delta pull.** `idempotency_keys` table + `IdempotencyService.runOnce(manager, …)` running inside the business transaction; wired on all 5 production POSTs. `?since=<ISO>` on all 5 cached masters' GET endpoints with `deleted` flag per row. 12 new e2e → 301 total. P5.1 is now complete.
  - P5.1b ✅ **PRD-04 consumption + LEK-02.** Making + firing endpoints grew a `consumption[]` block that writes a stock OUT per row through `StockService.record(manager, ...)` **in the stage's transaction** — if coal is short, the whole stage rolls back and the yard is never silently wrong. New `production_consumptions` table pins each row to the exact `stock_movements` it wrote. LEK-02 report sums fuel against fired bricks per batch / kiln / month and flags any row > ±15 % from the median within the window. 11 new e2e → 289 total.
  - P5.1a ✅ **production backend — batches, stages, sorted-good → stock, LEK-01.** Three tables with hand-written CHECKs that keep each stage's counts in its own columns. Sorting writes stock per grade through `StockService.record(manager, ...)` in the batch's transaction — the first use of INV-05 wiring, so if any grade is rejected the whole sort rolls back and nothing moved. Stage order enforced (`making → firing → sorting`, drying optional) and `(batch, stage)` is unique — correction is reversal, not an edit. New permissions `production.view` / `production.manage`. 19 e2e tests, incl. cross-tenant refusal before any write and the permission split (Accountant GET 200, POST 403). Backend e2e 241 → 278.
  - P0.1 ✅ git, PDFs, brain, docs 01–13, AI entry files, `pnpm status` generator.
  - P0.2 ✅ monorepo, shared package, docker-compose, NestJS 11 backend, `/health`, migrations, unit + e2e.
  - P0.3 ✅ web shell — app router, DS primitives (Button/Card/Badge/Input/Skeleton/EmptyState), layout (Sidebar/Topbar/PageHeader/KilnSwitcher), lib + stores, features/system health hook, 1 Vitest test.
  - P0.4 ✅ **closed** — mobile folder structure, placeholder app, widget test, `env/dev.example.json`, `mobile/README.md`. That was everything P0.4 could do without the Flutter SDK; **the rest of the original P0.4 (flutter create, packages, theme, widgets, router, Drift, l10n) is now step M0.** P0.4 is not pending — do not reopen it.
  - P0.5 ✅ CI workflow, Husky pre-commit + commit-msg, .prettierignore fix.
  - P1.1a ✅ backend auth & RBAC skeleton: 11 entities, JWT access+refresh, guards, CRUD controllers, migration, first tests.
  - P1.2a ✅ web auth foundation: `api-client` (envelope unwrap, typed `ApiError`, single-flight 401→refresh→retry), token custody per ADR-016, auth store, login page, `AuthGuard`, sign-out. Verified in a real browser against the running API: login → dashboard, hard reload restores the session, sign-out clears both sides.
  - P1.2b ✅ web shell: user dropdown + change-password, company switcher, kiln switcher, permission-aware nav, and the company / kilns / financial-year screens. **ADM-01…04 are the first features to reach ✅.** Sidebar turned into a drawer below `md` — it was a 224 px rail on a 375 px phone, which broke the entry screens the new CONVENTIONS rule exists to protect.
  - P4.2 ✅ **web stock screens — phase P4 complete.** A Stock section with current stock and the movement register. The adjustment form is gated on **`inventory.adjust`**, not `inventory.manage`, so the separation built in P4.1a survives into the UI. The register's running-balance column only appears once the filters narrow to one subject in one warehouse, and says why when it does not. Driven in a real browser: opening stock 40,000 → adjustment −500 → closing 39,500, with the adjustment's reason shown inline in the register. Two DOM-id defects found and fixed that way (see below).
  - P4.1b ✅ **stock reports (INV-07)** — current stock with the identity spelled out column by column (`opening + purchased + produced + adjustedIn − sold − wasted − adjustedOut = closing`), so an owner who distrusts the closing figure can see which kind of movement produced it. `asOf` answers as at a past date; `from` folds everything earlier into opening, the same convention the Trial Balance uses. The movement register carries a **running balance only when narrowed to one subject in one warehouse** — across different items in different yards it would be a number that means nothing — and it continues correctly onto page 2 rather than restarting. e2e 220 → 238.
  - P4.1a ✅ **the stock ledger** — `StockService`, the only writer of `stock_movements`, taking the **caller's** `EntityManager` so a document and its stock commit together (the `PostingService` pattern). One table for items and grades (ADR-023), one-sided quantities (ADR-024), quantity only and no value (ADR-025), and no negative stock except by a reasoned adjustment (ADR-026). `inventory.adjust` is a **separate, restricted permission**: a store keeper may record stock but may not write off a shortfall, and there is a test for exactly that. Backend 119 → 134 unit, e2e 183 → 220.
  - P3.2 ✅ web masters: a Masters section with a tab per module. Parties with opening balance and the **PTY-04** ledger statement (which leads with "They owe you" / "You owe them" rather than a raw Dr/Cr), inventory, transport, taxes/HSN with a 5/12/18/28 split helper, and wage rates that fill in each activity's usual unit. **Phase P3 complete.** Driven in a real browser, which caught a duplicate-error message that read "A record with this hsn rates company code already exists".
  - P3.1 ✅ backend masters, then **audited line by line and repaired** — see the two sections below. Nine modules, 183 e2e.
  - P2.2 ✅ accounting on the web: voucher entry with a live Dr/Cr total that blocks posting until it balances, Day Book with reversal, chart of accounts with a ledger statement, Trial Balance. **Phase P2 complete — ACC-01…05 all ✅, CP1 6 % → 10 %.** Two real bugs found by running it: blank amount fields failed validation, and a `date` column read through a raw query shifted a day in IST.
  - P2.1c ✅ the books: Day Book, Ledger statement with a running balance on the ledger's natural side, Trial Balance proving Σ Dr = Σ Cr. Verified on real journals — a reversal leaves the trial balance balanced because both entries stay in. e2e 38 → 53.
  - P2.1b ✅ **`PostingService`** — the spine. Balanced, FY-gated, tenant-checked, written in the **caller's** transaction so a document and its journal commit together. Gapless voucher numbering under 8 concurrent posts, and a rejected post does not burn a number. Reversal instead of editing; no update route exists. Manual vouchers (receipt/payment/contra/journal). Backend 64 → 97 unit, e2e 22 → 38.
  - P2.1a ✅ chart of accounts: 22 Tally-style groups, 28 ledgers, 8 voucher types, **seeded per company inside company creation** so a tenant cannot exist without somewhere to post. Opening balances (ACC-04) transactional, and honest about an unbalanced set rather than refusing it. Four DB CHECK constraints verified against Postgres. Backend tests 31 → 64.
  - P1.2c ✅ web admin: users list + create + edit (role, kiln access, active), and the Owner's audit viewer with filters and paging. **ADM-05…07 complete — P1 is done on the web side.** Fixed a shared-schema bug that made every optional text field reject a blank value.
  - P1.1b ✅ **repair of P1.1** — see "Why P1.1b existed" below. Tenant isolation, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening. 31 unit + 22 e2e green.
- **Half-done:** none.
- **OPEN_QUESTIONS #2 and #7 are answered by design, not by a reply:** ADR-018 makes brick grades and GST rates per-company rows the owner and their CA fill in, so neither blocks a build step.
- **Known flake (unreproduced):** `pnpm test` across the whole workspace failed two web files once, immediately after
  a large batch of new test files landed; four consecutive full runs since have been clean and the failure message was
  not captured. Not diagnosed — recorded rather than claimed fixed. If it recurs, capture the message before changing
  anything.
- **Carried gaps:** the opening-balance *screen* is not built (the API is, and the Trial Balance surfaces the difference). **Every master list now paginates**; the remaining unpaginated lists are the P1 admin ones (companies, sites, financial years, ledgers, voucher types).
- **Then:** P1.3 (mobile login + sync setup) → P2.1 (accounting engine) → …

### Why P1.1b existed (read before marking any step ✅)
P1.1 was committed as `BE ✅ / Tests ✅` for ADM-01…07, but an audit found the backend did not meet those requirements:
cross-tenant read **and write** on six endpoints (`company_id` taken from the URL, never checked); `password_hash` returned by `GET /users`;
every response double-wrapped `{data:{data}}`; Zod validation failures surfacing as 500; the 9 roles never seeded, so `RolesGuard` denied
every permissioned route; the audit log a table with no writer; and ADM-02 switch-company, ADM-04 FY create/activate, ADM-05 change-password
all simply absent. `pnpm status` could not catch the wiring gap because its generator ignored `BE 🧩`.
**Lesson for every future step:** a column is ✅ only when a test proves it, not when the file exists. Tenancy and audit are in the
"never cut correctness" list — give them an e2e test in the same step, as `backend/test/tenancy.e2e-spec.ts` now does.

### The schema damage — the most serious thing found so far (2026-10-09)
`1791532862193-InventoryMasters` (P3.1b) was produced by `typeorm migration:generate`. Our indexes, unique keys and
CHECK constraints live in hand-written SQL and are **not** declared on the entity classes, so the generator read all of
them as drift: its `up()` is **82 DROP statements with no adds**, and the CREATEs are in `down()`. Running it forward
stripped the database of its own guarantees — unique voucher numbers (GST invoice numbering), the gapless-numbering
lock row, one active financial year, one ledger per party, unique ledger names, ~30 foreign keys. Both live databases
were checked: every master table had nothing but a primary key. **Every test still passed**, because the application
code checks the same rules in TypeScript.
Repaired by `1791600000000-RepairSchemaConstraints` (idempotent). A fresh database and a repaired one now match
exactly: 63 indexes, 42 foreign keys, 10 checks.
**Two rules came out of this, both now in AGENTS.md:**
1. **Never run `migration:generate`** — use `migration:create` and write the SQL. AGENTS.md used to recommend
   `generate`, which is why this happened.
2. **Test the schema, not just the API.** `backend/test/schema-integrity.e2e-spec.ts` asserts the constraints exist in
   Postgres. It is the only kind of test that could have caught this, and it runs with the e2e suite.

### What the P4.2 review found (2026-10-09)
A second pass over the new screens against the backend contract. The contract itself was clean — routes, params,
response fields, pagination and the permission split all matched. Four real defects behind it:
- **`text-error-foreground` and `text-warning-foreground` are not classes in this project.** tailwind.config.ts
  defines flat `danger`/`warning`/`success` with no `error` and no `-foreground` variants, so Tailwind generated
  nothing: a **negative closing balance, the whole point of a leakage report, rendered in ordinary text.**
- **Quantities ran through JS floats**, which CONVENTIONS forbids. The money helpers could not be reused —
  `toPaise` truncates at two decimals and would silently drop the third of a tonne weight — so
  `packages/shared/src/format/quantity.ts` adds the same integer-scaled arithmetic at three.
- **Reopening the adjustment dialog offered a one-click duplicate.** Both dialogs stay mounted and `close()` reset
  only the mutation, not the fields. Opening stock is protected by a unique index; an adjustment is not, and it is
  the one movement allowed below zero.
- A failed picker query rendered an **empty dropdown**, which reads as "there are none".
**Lesson:** a CSS class name is not type-checked. `text-error-foreground` looked plausible, compiled, linted, and did
nothing — and a test asserting the class string would have passed while the UI was wrong. Check a new utility class
against `tailwind.config.ts`, or copy one the app already uses.

### What the browser run found in P4.2 (2026-10-09)
Neither would have failed a unit test, and both were only visible by driving the real app:
- **Duplicate DOM ids across two mounted dialogs.** The opening-stock and adjustment dialogs are both mounted at all
  times, and both rendered `stock-warehouse` / `stock-item` / `stock-brick-type`. Every `<label for>` in the second
  dialog pointed at the first dialog's field, so clicking a label focused the wrong control. The pickers now take an
  `idPrefix`.
- **`Dialog` used a hardcoded `id="dialog-title"`** for `aria-labelledby`. Any screen with two dialogs — most of them;
  the inventory masters page has four — announced the wrong title to a screen reader. Now `useId()` per instance, and
  `aria-describedby` wired up while there.

### What the P6.1 audit found (2026-10-12)
Audited before closing P6, as P3.1, P4.1 and P5.1 were. The engine was well built — 17 endpoints, LEK-03 exposure
live, payouts through `PostingService`, future-date guards already applied, 18 e2e green. Three defects behind that,
two of them money:
- **The same work could be paid for twice.** Accrual read a date range and credited the Sardar, but recorded nothing
  about the range it had paid. A second call, or any overlapping range, posted the whole amount again. Proved live:
  the first accrual posted ₹500 and the second was refused only after the fix (ADR-035).
- **A worker could be marked present twice on one day** and be paid twice for it — no guard in code or schema
  (ADR-036).
- **A missing wage rate fell back to an invented ₹650 per 1,000** (ADR-037). The existing accrual test passed only
  because of that fallback.
- Structural: five of the six new tables had **no foreign key to `companies`**, two had no `company_id` index, and
  none of the labour tables were in `schema-integrity.e2e-spec.ts` — the P3 failure mode, where a constraint nothing
  asserts can be dropped silently.
**Lesson:** an idempotency key is not a duplicate guard. It makes a *retry* safe; it says nothing about a second
genuine request for the same work. Anything that computes money from a date range needs to record the range.

### What the P5.1 audit found (2026-10-10)
Audited before building the screens, as P3.1 and P4.1 were. The structure was sound — idempotency correct under
concurrency, decimal discipline clean, tenant isolation everywhere, CHECK constraints in the database. **The two
leakage reports were not**, and they are the product's ROI claim:
- **LEK-01 reported every unsorted batch as 100 % leakage.** Proved it against the live endpoint: three ordinary
  work-in-progress batches each returned `unexplained: "10000.000"` of 10,000 moulded, with nothing on the row to
  distinguish that from theft. Null until sorted now (ADR-029).
- **LEK-01 conflated drying loss with post-firing disappearance** into one permanently non-zero figure — the kind
  that trains an owner to ignore the report. Split out (ADR-030).
- **LEK-02 treated "no coal booked" as zero coal**, so one missed entry re-based the median for every other batch,
  and a mostly-unbooked window flagged nothing at all. Excluded from the median now (ADR-031).
- **LEK-02's outlier flag was nonsense at two rows** — a 20 % gap passed, a 36 % gap flagged the *efficient* batch.
  Minimum three (ADR-031).
- **LEK-02 bucketed fuel by batch date, not firing date**, so month-to-month was wrong at every boundary (ADR-032).
- **PRD-07 was never built and had no home in the plan** — P5.1 was marked complete without it and P5.2 was scoped
  as screens only. It would have been skipped silently. Built.
- Production entries could be **dated in the future**; brick counts accepted **fractions** (ADR-033).
- Sync: delta pull had **no watermark**, so a row committed during a sync could never be seen again; a revoked kiln
  left a stale entry on the device forever.
**Lesson:** the two worst defects were in what a row *means* when data is incomplete, not in the arithmetic — the
arithmetic was right and every number in the tests was correct. Tests that only exercise a complete, happy batch
cannot find this class of bug. Ask what the report says about work that is half-done.

### What the P4.1 audit found (2026-10-09)
Audited before starting P4.2, the same way P3.1 was. Three defects, two of them real:
- **The negative-stock guard did not hold under concurrency.** Read-then-write: eight simultaneous issues of 20 each
  all passed a check against a balance of 100 and took it to **−60**. The entire point of ADR-026 was void whenever
  two people acted at once — and with offline sync that is the normal case. Fixed with a per-subject advisory lock
  (**ADR-027**), with the concurrency test kept.
- **The register's carried balance silently dropped same-date rows.** `created_at` was used to break the tie but never
  selected, so it was always `undefined` and fell back to 1970. Page 1 of a four-row same-date set reported **700**
  where the truth was **1000**. The original test only checked page 2, where the bug cannot show.
- **No guard against a future-dated movement** (**ADR-028**) — a mistyped year would not fail anywhere visible, it
  would quietly distort every `asOf` report.
**Lesson:** a test that passes can still be the wrong test. The page-2 assertion and the single-threaded balance check
both passed while the code was wrong; it took asking "what would break this?" rather than "does this work?".

### What the P3.1 audit found (read before marking any step ✅)
P3.1a (parties) was built properly — 20 e2e tests including cross-tenant read **and** write. P3.1b and P3.1c were not:
they shipped happy-path tests only, and four real defects were hiding behind that.
- **Cross-tenant write**: `POST /inventory/warehouses` trusted `siteId` from the body, so a company could attach a
  warehouse to another company's kiln; `hsnId` on items was unchecked the same way. `company_id` came from the JWT
  correctly (ADR-013) — but **the ids it points at were never checked**. One `assertBelongsToCompany` guard now covers both.
- **Money as floats**: wage rates and GST rates were `z.number()` / `number`, while the columns are NUMERIC(18,2) and
  the driver returns strings. The responses lied about their own type and a float would have reached the GST and
  wage maths. Now decimal strings end to end.
- **Same field, two shapes**: create returned `"6.00"`, update returned `"6"`. Rates normalise at the schema edge now.
- **Role matrix**: the Accountant had no `taxes.manage` even though ADR-018 names the client's CA as the authority on
  HSN and GST. Widened, with an invariant test over the catalogue.
**Lesson, the same one as P1.1b:** a happy-path test is not a passing step. Tenancy and audit are "never cut
correctness" — a step is ✅ only when a test proves a *second tenant is refused*, not when the route returns 201.
`backend/test/helpers/tenant-fixture.ts` makes that two lines, so there is no excuse to skip it again.

### Known gaps carried forward (not blocking P2)
- List endpoints other than `/audit-logs` do not paginate; `CONVENTIONS.md` specifies `?page&limit` → `meta`.
- Company/Site/FinancialYear responses are raw entities; only users go through a response DTO (`UserSummary`).
- ~~`BusinessRuleException` never thrown~~ — **adopted in P2.1a** (`LEDGER_SYSTEM_REQUIRED`, `LEDGER_SYSTEM_GROUP_FIXED`, verified returning 422). Keep using it for posting rules.
- ~~`QueryFailedError` is not mapped~~ — **fixed 2026-10-09**: 23505 → 409 `DUPLICATE_VALUE`, 23503 → 409 `REFERENCE_CONFLICT`, 23514/23502 → 422. Anything else stays a logged 500.
- No request/correlation id in error responses, so a 500 cannot be traced to its Pino log line.
- **No "create company" screen.** `POST /companies` is built and tested but no UI calls it, so a second company can only be
  created through the API or the seed. ADM-01/ADM-02 do not ask for it in writing (the switcher and the multi-company schema
  are what they specify), but an owner who wants a second kiln business cannot add one from the web today. Small screen,
  reuses `CompanyForm` — fold into P2.2 or a later admin pass unless the client needs it sooner.
- `GET /companies/:id` has no consumer either: the web reads `/companies/current` instead. Harmless, kept for the
  company-detail screen that would come with the above.

- **Work split (updated 2026-10-08):** the **P track** (backend + web) is built here; the **M track** (Flutter app) is built later, wherever the Flutter SDK is available — another machine, or this one once Flutter is installed. **Backend and web come first either way.** Each track keeps its own Resume block below. Whoever builds the M track edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

## ▶ Resume here: M track — the Flutter app (needs the Flutter SDK)
- **State:** M0 not started. `mobile/` holds `pubspec.yaml` (no packages), `lib/main.dart` + `lib/app.dart` placeholders,
  `test/app_test.dart`, the full `lib/core/*` and `lib/features/<auth|production|attendance|grn|dispatch|sync>/{data,domain,presentation}`
  folder tree, `env/dev.example.json` and `mobile/README.md`.
- **Flutter is not installed in the current environment.** Nothing in `mobile/` is built, analysed or tested here, and `mobile/` must never be reported as red or blocking.
- **Where this runs:** any machine with the Flutter SDK. If no second machine turns up, install Flutter here — but only **after** the backend and web are substantially done, so the P track is never interrupted.
- **Next step (exact):** M0 — follow `mobile/README.md` "First time" (`flutter create`, `flutter pub add`, analyze, test), then
  build the scaffold: theme tokens from `docs/05-design-system.md`, core widgets, go_router, dio client, Drift stub, sync
  skeleton, l10n → `flutter analyze` + `flutter test` green → commit + push. Then M1 → M6 in order.
- **Before starting M2:** SYN-01 shipped in P5.1c (2026-10-10) — the 5 production POSTs honour `Idempotency-Key` and return the original result on replay. SYN-02 (`?since=`) also shipped on the 5 cached masters. M2 is unblocked.
- **What M0 is:** the half of the original P0.4 that needed Flutter. P0.4 itself is closed — see the Done list above.
- **APIs ready for mobile now:** `/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`, `/sites` — all tested, see `API_INDEX.md`.
- **Blockers:** none. The only prerequisite is a Flutter SDK, and nothing in the P track waits on it.

## CP1 internal steps

**Two independent tracks.** The **P track** (backend + web) runs on this machine. The **M track** (Flutter) runs on a machine
with the Flutter SDK and starts only once the P track is far enough along — the app has no APIs to call before then.
The P track is never blocked by the M track.

### P track — backend + web (here; no Flutter needed)

| Phase | Step | Scope | Status |
|---|---|---|---|
| P0 | P0.1 | Preflight, git, PDFs, brain, docs, AI files | ✅ |
| P0 | P0.2 | Monorepo, docker-compose, backend scaffold + /health | ✅ |
| P0 | P0.3 | Web scaffold, tokens, shell, Vitest | ✅ |
| P0 | P0.4 | Mobile **folder structure only** (no Flutter needed) — the rest is M0 | ✅ |
| P0 | P0.5 | CI, Husky hooks, commitlint, verify, tracking | ✅ |
| P1 | P1.1a | Backend auth, companies, kilns, FY, users, roles — entities, JWT, guards, CRUD | ✅ |
| P1 | P1.1b | Backend repair: tenant isolation + tests, RBAC seed, audit trail, API contract, missing ADM endpoints, schema hardening | ✅ |
| P1 | P1.2a | **Web auth foundation:** api-client envelope + refresh-on-401, auth store, login page, route guard, logout | ✅ |
| P1 | P1.2b | Web shell wiring: user menu, company switcher, kiln switcher, permission-aware nav, company/kilns/FY screens | ✅ |
| P1 | P1.2c | Web admin: users & roles screens, audit log viewer, DataTable/Select/Dialog primitives | ✅ |
| P2 | P2.1a | **Backend: chart of accounts** — ledger groups, ledgers, voucher types, migration, per-company seed, opening balances (ACC-01, ACC-04) | ✅ |
| P2 | P2.1b | Backend: `PostingService` (balanced, atomic, FY-checked, immutable + reversal) and manual vouchers — receipt, payment, contra, journal (ACC-02, ACC-03) | ✅ |
| P2 | P2.1c | Backend reports: Day Book, Ledger statement, Trial Balance (ACC-05) | ✅ |
| P2 | P2.2 | Web: voucher entry, Day Book, Ledger, Trial Balance | ✅ |
| P3 | P3.1a | **Backend: parties + auto ledger** (PTY-01…03) and the company GST scheme | ✅ |
| P3 | P3.1b | Backend: units, items, brick types, warehouses (INV-01, INV-02, PRD-01) | ✅ |
| P3 | P3.1c | Backend: vehicles, drivers, HSN + GST rates, wage rates (VEH-01, GST-01, LAB-03) | ✅ |
| P3 | P3.2 | Web master screens + party ledger | ⬜ |
| P4 | P4.1a | **Backend `StockService`**, the stock ledger, opening stock and adjustments (INV-03, INV-04, INV-06) | ✅ |
| P4 | P4.1b | Backend stock reports: current stock and the movement register (INV-07) | ✅ |
| P4 | P4.2 | Web stock screens + reports | ✅ |
| P5 | P5.1a | Backend: batches, stage entries, sort → finished stock in-tx, **LEK-01 brick yield variance** | ✅ |
| P5 | P5.1b | Backend: **PRD-04** coal + soil consumption from stock + **LEK-02 coal per 1,000** | ✅ |
| P5 | P5.1c | Backend: **SYN-01** `Idempotency-Key` + **SYN-02** `?since=` delta pull — gates mobile M2 | ✅ |
| P5 | P5.2 | Web production entry + the two variance reports | ✅ |
| P6 | P6.1 | Labour backend + **LEK-03 live advance exposure, with the warning at advance entry** | ✅ |
| P6 | P6.2 | Web attendance, wages, advances, settlement + exposure screen | ✅ |
| P7 | P7.1a | **Backend: PO + GRN** → stock IN through `StockService` (PUR-01, PUR-02, INV-05) | ✅ |
| P7 | P7.1b | Backend: supplier bill with input GST + payment, bill-wise (PUR-03, PUR-04, GST-03) | ✅ |
| P7 | P7.1c | Backend: purchase return / debit note + payables ageing (PUR-05, PUR-06) | ✅ |
| P7 | P7.2 | Web: purchases screens — PO, GRN, bills, payments, ageing | ✅ |
| P8 | P8.1 | Backend: quotation, SO, GST invoice + stock OUT, PDF, receipt bill-wise, credit/debit notes, receivables ageing | ✅ |
| P8 | P8.2 | Web: quotations, orders, invoices (+ PDF), receipts, notes, receivables | ✅ |
| P9 | P9.1 | Dispatch & transport backend + **LEK-04 gate reconciliation** | ⬜ |
| P9 | P9.2 | Web dispatch, trips, vehicle profitability + gate report | ⬜ |
| P10 | P10.1 / P10.2 | Expenses, cash/bank, P&L/BS, GSTR registers + **GST-07 reconciliation** — backend / web | ⬜ |
| P11 | P11.1 | Dashboard aggregates + **CST-01 cost per 1,000 vs the ₹4,100 benchmark** | ⬜ |
| P11 | P11.2 | Web dashboard, **RPT-02 daily report, RPT-03 sales register, RPT-04 labour registers**, exports | ⬜ |
| P13 | P13.1 / P13.2 / P13.3 | e2e + security / deploy + backups / onboarding + guide + UAT → **CP1 sign-off** | ⬜ |

### M track — Flutter supervisor app (later, wherever Flutter is installed)

**M1 can start as soon as P1.2 is done** (the auth API it needs is already built and tested) — but the plan is to finish the
backend and web first. Whoever builds this track edits only the **Mob** columns in FEATURES/API_INDEX, then runs `pnpm status`.

| Step | Scope | Needs from the P track | Status |
|---|---|---|---|
| M0 | `flutter create`, packages, theme tokens, core widgets, go_router, dio client, Drift stub, l10n, analyze + test green — **this is the unfinished half of the old P0.4** | — | ⬜ |
| M1 | Login, kiln selection, role-based home, offline storage + sync queue skeleton (MOB-01/02) | P1.1b ✅ | ⬜ |
| M2 | Production entry offline (PRD-06) | P5.1 **incl. SYN-01** | ⬜ |
| M3 | Attendance offline (LAB-02) | P6.1 | ⬜ |
| M4 | GRN offline (PUR-02) | P7.1 | ⬜ |
| M5 | Dispatch + delivery acknowledgement (DSP-04) | P9.1 | ⬜ |
| M6 | Offline hardening (MOB-04), Android APK (MOB-05), **iOS build (MOB-06)** | all of the above | ⬜ |

> **Why M2–M5 must wait for `SYN-01`:** the app queues entries offline and resends them when the network returns. Without
> `Idempotency-Key` on the create endpoints, every retry creates a **duplicate** production entry, GRN or dispatch. That is
> backend work, buildable here without Flutter, and it is scheduled into P5.1 for exactly this reason.

### Step exit criteria that are easy to miss
A step is **not** ✅ until these are true. Check this list before marking any of them done.

| Step | Must also be true |
|---|---|
| **P5.1** | ✅ shipped 2026-10-10 (P5.1a+b+c). `SYN-01`: `idempotency_keys` + `IdempotencyService.runOnce(manager, …)` on all 5 production POSTs, written **in the business transaction** (per-key advisory lock). `SYN-02`: `?since=<ISO>` on the 5 cached masters, tombstones carry `deleted: true`. M2 is unblocked. |
| **P5.1 / P6.1 / P9.1** | The matching leakage report (`LEK-01`+`LEK-02` / `LEK-03` / `LEK-04`) ships **with** the module, not later. These are the client's ROI — see M13 in FEATURES.md. |
| **P6.1** | `LEK-03`'s warning fires **at the moment a new advance is entered**, not only in a report. |
| **any tenant-scoped module** | A cross-tenant refusal test in `backend/test/*.e2e-spec.ts`, as `tenancy.e2e-spec.ts` does. CONVENTIONS requires it. |
| **P5.2 / P6.2 / P7.2 / P9.2** | The entry screen is usable on a phone browser (single column, ≥44 px targets, numeric keypads). Where there is signal this is how the field actually enters data until the Flutter app exists — see CONVENTIONS → Web. |
| **any new create endpoint** | Decide explicitly whether the mobile app will ever call it. If yes, it needs `Idempotency-Key`. |

### Gate per track
- **P track (here):** `pnpm lint && pnpm typecheck && pnpm test && pnpm build` + `pnpm --filter @brics/backend test:e2e`.
  **Do not run `flutter analyze` / `flutter test` here — the SDK is not installed.** `mobile/` is not touched by the P track and is never a blocker for it.
- **M track (where Flutter is installed):** the above **plus** `dart run build_runner build -d && flutter analyze && flutter test`.

Exit criteria per phase: see BRICS_MASTER_PROMPT.md §12.

## CP2 (only after CP1 sign-off)
A1 banking/accounting adv · A2 adv GST (if approved) · A3 profitability/leakage · A4 admin extras · A5 AI anomaly · A6 IoT · A7 approved extras — all ⏭️

## Splits recorded
- **P5.1 → P5.1a + P5.1b + P5.1c** (2026-10-09). Batches + stages + sort-to-stock + LEK-01 go first (one session's worth, and the sort-into-stock tx is the one piece worth reviewing alone); P5.1b adds coal/soil consumption + LEK-02; P5.1c adds SYN-01 idempotency + SYN-02 delta pull. **P5.1 is not ✅ until all three ship** — see exit criteria.
- **P7.1 → P7.1a + P7.1b + P7.1c** (2026-10-12). Seven features and two money paths (stock and ledger) is more than
  one session. GRN moves quantity only; value enters with the bill — ACCOUNTING_RULES is explicit about that, so the
  two are separate steps rather than one.
- **P4.1 → P4.1a + P4.1b** (2026-10-09). The ledger and its reader are each a session, the same way `PostingService`
  (P2.1b) and the books (P2.1c) were split.
- **P3.1 → P3.1a + P3.1b + P3.1c** (2026-10-09). Nine master tables is three sessions. Parties go first and alone because
  each one auto-creates a ledger in the chart of accounts, which is the only part with real logic.
- **P2.1 → P2.1a + P2.1b + P2.1c** (2026-10-08). The chart of accounts, the posting engine and the reports are each a session's
  work, and `PostingService` is the one piece the whole product rests on — it gets a step to itself so its tests are not rushed.
- **P1.2 → P1.2a + P1.2b + P1.2c** (2026-10-08). One session could not cover auth plumbing, shell wiring and three admin
  screen sets. P1.2a is the foundation every later screen needs (envelope handling, token refresh, route guard).
- **P1.1 → P1.1a + P1.1b** (2026-10-08). P1.1a is the original backend auth/RBAC commit `54b2d13`. P1.1b is the repair: tenant isolation,
  RBAC seed, audit trail, API contract and the ADM endpoints P1.1 never built. Split recorded because P1.1 had been marked ✅ while
  ADM-02/04/05/06/07 were incomplete and tenancy was unenforced.
