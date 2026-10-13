# DECISIONS — ADR log (append-only)

Format: `ADR-NNN — title — date — decision — why — alternatives`

**ADR-001 — Monorepo with pnpm + Turborepo — 2026-10-07**
Decision: one repo; pnpm workspaces for backend, web, packages/*; Flutter in `mobile/` with its own tooling.
Why: shared types/Zod schemas, one CI, one brain. Alternatives: separate repos (drift between API and clients).

**ADR-002 — TanStack Query + Zustand, not Redux — 2026-10-07**
Decision: server state in TanStack Query; small UI state in Zustand.
Why: ~90% of ERP state is server data; Query gives caching/refetch/optimistic updates with less boilerplate. Alternatives: Redux Toolkit + RTK Query.

**ADR-003 — Two-level phase model — 2026-10-07**
Decision: Client Phases (CP1 MVP = SOW modules 1–12 basic depth; CP2 = advanced) vs internal one-session steps (P0.1…P13.3, A1…A7). Feature register in FEATURES.md.
Why: keep MVP lean as contracted; never leave a broken build between AI sessions.

**ADR-004 — Node 24 LTS — 2026-10-07**
Decision: Node 24 LTS (pinned `.nvmrc`, `engines >=24`). Why: Node 20 is end-of-life. Next.js 14 kept as fixed by SOW.

**ADR-005 — Tailwind CSS 3.4 with CSS-variable tokens — 2026-10-07**
Decision: Tailwind 3.4 + `hsl(var(--token))` colours, `class` dark mode. Why: proven with Next 14 and shadcn-style primitives. Alternatives: Tailwind 4 (fine later; migration is cheap).

**ADR-006 — Design tokens: deep green #0B6B3A + gold #E3A21A — 2026-10-07**
Decision: primary green scale, gold accent (sparingly), slate neutrals, bg #F8FAF9, separate semantic success (#16A34A family, cooler) vs brand green. Values in `docs/05-design-system.md`, `web/src/styles/tokens.css`, `mobile/lib/core/theme/app_colors.dart`.
Why: matches the palette in the client PDFs; text on primary passes WCAG AA (white on #0B6B3A ≈ 6.6:1).
_(Attribution corrected 2026-10-08: the palette comes from the brief. The decision itself is unchanged.)_

**ADR-007 — Commit Flutter generated code — 2026-10-07**
Decision: commit `*.g.dart` / `*.freezed.dart`. Why: fresh clone and AI sessions build without a codegen step failing. Alternative: generate in CI only.

**ADR-008 — One `parties` table with types — 2026-10-07**
Decision: customers, suppliers, Sardars, transporters, employees, others in one `parties` table with `party_types[]`; each party gets one ledger account. Why: one party can be both customer and supplier; single ledger statement. Alternative: table per type (as in Functional Spec §19 suggestion).

**ADR-009 — Money as strings over JSON — 2026-10-07**
Decision: API sends/receives money as decimal strings. Why: no float rounding in JS/Dart.

**ADR-010 — Backend stack versions: NestJS 11, TypeORM 0.3, TypeScript 5.9 — 2026-10-07**
Decision: NestJS 11 (CommonJS) + TypeORM 0.3.31 + TS ~5.9 + Jest 30 / ts-jest. Why: NestJS 12 is ESM-only (Jest ESM is experimental/fragile); ts-jest needs TS < 7; TS 6 changes defaults. Revisit (Nest 12, TypeORM 1, TS 6+) after CP1 — tech-debt item.

**ADR-011 — One env file per app — 2026-10-07**
Decision: `backend/.env`, `web/.env.local`, `mobile/env/dev.json` (each with a committed example). No root .env. Why: matches deployment (Render / Vercel / app build each own their variables); web never sees backend secrets.

**ADR-012 — pnpm build-script allow-list — 2026-10-07**
Decision: `allowBuilds` in `pnpm-workspace.yaml` — allow esbuild, @parcel/watcher, unrs-resolver; deny @scarf/scarf (telemetry). New packages with install scripts must be added explicitly.

**ADR-013 — Tenant scope comes from the JWT, never from the route — 2026-10-08**
Decision: no endpoint accepts a `company_id` from the client. Resources below a company (`/sites`, `/financial-years`, `/users`, `/audit-logs`) read it from the JWT; company-level routes (`/companies/:id`) assert membership through `MembershipService`; super admins bypass. `/companies/:cId/sites` and `/companies/:cId/financial-years` from P1.1 were removed.
Why: P1.1 shipped six endpoints that read `company_id` from the URL and never checked it, so any authenticated user could read and write another tenant's data. Putting the check in one service instead of each controller means a new module cannot forget it. Alternatives: validating the param in every controller (easy to miss); Postgres row-level security (heavier, and harder to test from the app side — revisit for CP2).

**ADR-014 — Zod at the edge instead of class-validator DTOs — 2026-10-08**
Decision: request bodies are validated by `ZodValidationPipe` against the schemas in `@brics/shared`; `AllExceptionsFilter` also maps a stray `ZodError` to 400. CONVENTIONS' "DTOs with class-validator" is superseded for request validation.
Why: the schemas already exist in `packages/shared` and are shared with the web forms (RHF + Zod), so one definition covers client and server and the types are inferred. P1.1 called `schema.parse()` inside handlers, which threw a raw `ZodError` and surfaced as a 500. Alternative: duplicate every schema as a class-validator DTO — two sources of truth for the same contract.

**ADR-015 — Refresh-token row id travels in the token — 2026-10-08**
Decision: the `refresh_tokens` row id is minted first and carried in the token's `jti`; refresh does one indexed lookup plus one bcrypt compare, checks `expires_at`, then rotates. Expiry is derived from `JWT_REFRESH_TTL`.
Why: P1.1 loaded every non-revoked token for the user and bcrypt-compared each one (~100ms apiece), so refresh latency grew with session count — a self-inflicted DoS. It also ignored `expires_at` and hardcoded 30 days. Alternative: store an unhashed lookup key (weaker if the table leaks).

**ADR-016 — Access token in memory, refresh token in localStorage — 2026-10-08**
Decision: the access token (15 min) lives only in a module variable, never in storage. The refresh token (30 days) is kept in `localStorage` under `brics_refresh`. On boot, if a refresh token exists the app calls `POST /auth/refresh` to get a fresh pair.
Why: the backend returns both tokens in the response body, so an httpOnly cookie is not available without changing the API. Keeping the short-lived token out of storage means an XSS payload has to stay resident to use it, rather than exfiltrating a token that works for 15 minutes. The refresh token is rotated on every use (ADR-015), so a stolen one is single-use and its theft is detectable. Cost: one extra `/auth/refresh` call on a hard page reload. Alternatives: both in localStorage (simpler, larger blast radius); httpOnly cookies (better, but needs the API to set cookies and a CSRF story — revisit for CP2).

**ADR-017 — The API client unwraps the envelope — 2026-10-08**
Decision: `apiClient.get<T>()` returns the `data` payload, not `{ data }`. Paginated endpoints use `apiClient.getPaged<T>()`, which returns `{ items, meta }`.
Why: every endpoint returns the envelope, so unwrapping once in the client keeps `.data.data` out of every hook and component. Decided now rather than after P1.2b/c wrote screens against the raw shape.

**ADR-018 — Masters are per company, seeded with defaults, owner-editable — 2026-10-09**
Decision: brick types, HSN codes, GST rates and wage rates are per-company rows (like the chart of accounts), seeded with sensible defaults and editable. Nothing about them is hardcoded.
Why: one owner may run several companies that genuinely differ — different brick grades, different products, different GST elections. The people who know the right values are the client's **CA** (GST, HSN) and the **owner/production manager** (grades, wage rates), not us. This is why OPEN_QUESTIONS #2 and #7 do not block P3: the answer is "whatever they enter". GST rates carry `effective_from`, so a rate change by notification does not silently re-rate invoices already issued.

**ADR-019 — The GST scheme is a property of the company, not of a product — 2026-10-09**
Decision: `companies.gst_scheme` is `regular_12_itc` or `composition_6_no_itc`, set per company.
Why: brick manufacturers elect a scheme; two companies of the same owner can be on different ones. It is not a per-item rate. It decides whether GST paid on inputs is **claimable credit or a cost** — and since coal is ~42% of the cost per 1,000 bricks, getting it wrong makes `CST-01` materially wrong. The field was missing from the P3 plan entirely until it was raised.

**ADR-020 — One ledger per party, group chosen by type precedence — 2026-10-09**
Decision: every party auto-creates exactly one ledger (`ledgers.party_id`, already uniquely indexed), inside the same transaction as the party. The group is picked by precedence over the party's types: customer → Sundry Debtors; else supplier or transporter → Sundry Creditors; else Sardar or employee → Labour Payables; else other → Sundry Creditors.
Why: ADR-008 keeps one `parties` table with `party_types[]`, so a party can be both customer and supplier, but must still have **one** ledger or their statement would be split across two accounts. Precedence gives a deterministic home. A balance landing on the contrary side is not a problem: the Trial Balance already presents each balance on its natural side, so a customer in credit reads correctly.

**ADR-021 — A foreign key in a request body is checked against the tenant, not trusted — 2026-10-09**
Decision: every service that accepts an id from a request body (`siteId`, `hsnId`, `unitId`, `partyId`, …) verifies that row belongs to the caller's company before using it. `assertBelongsToCompany` in the inventory service is the shape to copy.
Why: ADR-013 keeps `company_id` out of the body, which stops a caller *naming* another tenant — but it does not stop a caller *pointing at* one. P3.1b shipped with `POST /inventory/warehouses` taking `siteId` on trust, so a company could attach a warehouse to a kiln it did not own. Every module from P4 onward (GRN, dispatch, production) takes more of these ids, so the rule is written down rather than rediscovered.

**ADR-022 — Rates are decimal strings and are normalised at the schema edge — 2026-10-09**
Decision: GST percentages and wage rates are `string` in the schema, the entity and the JSON, and the Zod schema normalises them to two decimals (`'6'` → `'6.00'`) on both create and update.
Why: CONVENTIONS already said money is never a float; P3.1c typed rates as `z.number()` anyway, and TypeORM returns `numeric` as a string, so the entity type was simply wrong. The normalisation is the second half: without it, a create returned `"6.00"` (reloaded from the column) and an update returned `"6"` (echoed from the request), so the same field had two shapes depending on the verb.

**ADR-023 — One stock ledger for both items and brick grades — 2026-10-09**
Decision: a single `stock_movements` table, with `item_id` and `brick_type_id` both nullable and a CHECK that exactly one is set.
Why: a kiln holds two kinds of stock — purchased materials (coal, soil, diesel) and finished bricks by grade — but they behave identically: something comes in, something goes out, and the balance must reconcile. INV-07 asks for one report "by kiln/grade/item". Two tables would mean two services, two sets of rules and two chances to drift; one table means `StockService` is the only writer of either, exactly as `PostingService` is for journals.

**ADR-024 — A movement is one-sided, like a journal line — 2026-10-09**
Decision: each row carries `quantity_in` or `quantity_out`, never both, both non-negative, with the total greater than zero — enforced by CHECK constraints in Postgres, not only in code.
Why: it makes INV-07's identity (`Opening + Production + Purchase − Sales − Wastage = Closing`) a sum rather than a case analysis, and it matches `voucher_lines`, so the stock ledger reads the way the financial ledger already does. A signed quantity column would let a careless `-0` or a double negative pass unnoticed.

**ADR-025 — Stock movements carry quantity only; value comes later — 2026-10-09**
Decision: no rate or amount on a stock movement. Quantity is `NUMERIC(18,3)` carried as a decimal string.
Why: ACCOUNTING_RULES already says pure stock events move quantity only — value enters through bills and invoices, and closing stock is valued at period end (OPEN_QUESTIONS #4, due in P10). Putting a rate here would create a second, competing source of cost. Three decimal places because coal is weighed in tonnes while bricks are counted in pieces; strings for the same reason money is a string — never a float.

**ADR-026 — Stock cannot go negative, except by an explicit adjustment — 2026-10-09**
Decision: `StockService` refuses a movement that would take a balance below zero, with `STOCK_INSUFFICIENT`. Only a manual adjustment (INV-06), which already requires a reason and a restricted permission, may do so.
Why: this product exists partly to catch leakage (M13). Silent negative stock is precisely what theft looks like in the data, so the database should not accept it quietly. The escape hatch is deliberate: a correction is recorded as a correction, by a named user, with a stated reason, rather than hidden inside an ordinary issue.

**ADR-027 — The negative-stock check takes an advisory lock — 2026-10-09**
Decision: before reading a balance to refuse an issue, `StockService` takes `pg_advisory_xact_lock` keyed on company + warehouse + subject, and refuses outright if it is not inside a transaction.
Why: ADR-026 was read-then-write, which is a race. An audit test proved it: eight concurrent issues of 20 each all passed a check against a balance of 100 and took it to −60. A row lock cannot help, because the rows that matter are the ones about to be inserted. The lock is per subject so unrelated stock never queues, and only the `out` path takes it — an `in` committing alongside can only make more stock available, so the worst it causes is a refusal that would have succeeded a moment later. Offline mobile sync (M14) makes concurrent writes ordinary, not exotic.

**ADR-028 — A stock movement cannot be dated in the future — 2026-10-09**
Decision: `StockService` refuses `movement_date > today` with `STOCK_DATE_IN_FUTURE`.
Why: stock cannot have moved tomorrow. A mistyped year is the common data-entry error on this screen and it would not fail anywhere visible — it would quietly distort every `asOf` report instead. Financial-year gating is a separate question and stays with P10 closing stock (OPEN_QUESTIONS #4).

**ADR-029 — A loss figure is null until the batch is sorted — 2026-10-10**
Decision: `unexplained` and `postFiringLoss` in LEK-01 are `null` for any batch (or group) that has not been sorted, and the row carries `sortingComplete`, `batchCount` and `pendingSortCount`.
Why: good, broken and reject counts are all zero until somebody sorts the batch, so `green − (0 + 0 + 0)` reported **every batch still in the kiln as a total loss**. Verified against the real endpoint: three ordinary work-in-progress batches each came back with `unexplained: "10000.000"` out of 10,000 moulded. On the screen whose entire purpose is detecting theft, that is an accusation of 100 % theft against normal work, and nothing on the row let the reader tell the two apart. A null says "not known yet", which is the truth.

**ADR-030 — Pre-firing and post-firing loss are reported separately — 2026-10-10**
Decision: LEK-01 keeps `unexplained` exactly as the requirement defines it (`green − (good + broken + rejects)`) and adds `preFiringLoss` (`green − fired`) and `postFiringLoss` (`fired − (good + broken + rejects)`).
Why: the single figure conflates two unrelated things. Bricks lost between moulding and firing are drying and handling breakage — ordinary, large and seasonal. Bricks that entered the kiln and never came out of sorting are the ones worth asking about. Reported as one number, the normal loss produces a permanent non-zero "leakage" that trains the owner to ignore the report. `postFiringLoss` is the figure to act on.

**ADR-031 — The fuel outlier flag needs three comparable rows, and "no fuel booked" is not zero — 2026-10-10**
Decision: LEK-02 returns `ratio: null` plus `fuelRecorded: false` when nothing was booked against the fuel item; such rows are excluded from the median. The outlier flag requires at least three rows with a ratio, and an outlier carries `direction: 'over' | 'under'`.
Why: two things were wrong. A missing consumption row scored `0.000` and entered the median as if the kiln had burned no coal — one missing data-entry row silently re-based the threshold for every other batch, and if more than half a window was unbooked the median went to zero and **nothing was flagged at all**. Separately, with two rows the median is their mean, so both rows sit equidistant from it: a 20 % gap passed silently and a 36 % gap flagged the efficient batch alongside the wasteful one. Three is the smallest sample where the median lands on an actual observation. `direction` is what makes the flag actionable — over-consumption is fuel going missing, under-consumption usually means coal booked against the wrong stage.

**ADR-032 — Fuel is attributed to the firing date, not the batch date — 2026-10-10**
Decision: LEK-02's date window and its `month` bucket both use the firing entry's date.
Why: coal burns when the chamber is fired, which can be weeks after the batch was loaded. On `batch_date`, a batch loaded 28 February and fired 3 March filed its March coal under February and disappeared from a March-only report entirely — so a month-to-month fuel comparison, which is the whole point of the grouping, was wrong at every month boundary.

**ADR-033 — Brick counts are integers, fuel is decimal — 2026-10-10**
Decision: `greenBricks`, `firedBricks`, `brokenBricks`, `rejectBricks` and a sorting output's `quantity` use a whole-number schema; consumption quantities keep three decimals.
Why: CONVENTIONS says "Brick quantities = integers", but both shared one `quantity` schema with the three decimals that ADR-025 gave to coal, because coal is weighed in tonnes. `greenBricks: "10000.555"` was accepted and surfaced in the leakage report as 0.555 of a missing brick.

**ADR-034 — A delta pull is ordered by its watermark and returns one — 2026-10-10**
Decision: with `?since=` present, a list is ordered `GREATEST(updated_at, deleted_at) ASC, id ASC`, the window is inclusive (`>=`), the `isActive` filter is ignored, and the response carries `meta.nextSince` — the only value a client may send back as its next `since`. The watermark is `now() − 60s`, floored at the `since` we were given and capped at the last row of a page when more pages remain.
Why: `?since=` shipped returning rows and no watermark, so every client-side guess lost data permanently. TypeORM stamps `updated_at` when the UPDATE runs, not when it commits, and Postgres is READ COMMITTED: a row stamped at T and committed at T+d is invisible to a pull at T+d/2, and a bare `now()` watermark would step over it and never send it again — hence the lag, which must exceed the longest write transaction (60s is well past anything here, and the cost of being generous is only re-sending a minute of rows the device upserts by id anyway). Ordering by `created_at`/`name`/`activity` was the second hole: paginated at 25, `max(updated_at)` of page 1 skipped every changed row waiting on page 2 with a smaller stamp. Inclusive `>=` is the third: at millisecond resolution rows share a stamp, and strictly-greater dropped the ties. `isActive` is the fourth — `isActive=false` is this product's only retirement mechanism (there are no DELETE endpoints), so filtering a delta by it hides the exact event the device needs. Revoked site grants are stamped rather than deleted for the same reason: a device acts on a tombstone, never on an absence. Alternative: a monotonic sequence column (`xmin`-style or a `sync_seq`) — provably exact and no lag, but a new column, a new index and a trigger on every table; revisit for CP2 if the 60s overlap ever costs anything.

**ADR-035 — A wage accrual records the period it paid for — 2026-10-12**
Decision: `labour_wage_accruals` stores every accrual's period and voucher, written in the same transaction as the journal, and a new accrual whose period overlaps an existing one for that Sardar is refused with `WAGES_ALREADY_ACCRUED`.
Why: accrual read production and attendance over a date range and credited the Sardar, but nothing recorded that it had done so. A second call for the same range — or any overlapping range, such as 1–15 followed by 1–31 — posted the whole amount again, and the Sardar was owed it twice. An `Idempotency-Key` does not help: it catches an identical retry, not a genuine second request. The service was already auditing against an entity named `labour_wage_accruals` that did not exist.

**ADR-036 — Attendance is unique per worker per day — 2026-10-12**
Decision: partial unique indexes on `(labour_group_id, worker_id, date)` and, for gang-level rows, `(labour_group_id, date)`.
Why: neither the service nor the database stopped the same worker being marked present twice on one day, and daily wages are summed straight from attendance — so a duplicate was paid twice. Two partial indexes rather than one because `worker_id` is nullable: attendance may be recorded for a whole gang or a named worker, and a single index over a nullable column would not constrain the gang rows at all.

**ADR-037 — A missing wage rate is refused, not invented — 2026-10-12**
Decision: accrual throws `WAGE_RATE_NOT_SET` when no active making rate exists, instead of falling back to ₹650 per 1,000.
Why: the fallback silently priced a whole season's piece work at a number nobody had agreed to, and it hid the fact that the master was never configured. ADR-018 already says the owner sets these rates; inventing one contradicts that. The existing test passed only because of the fallback, which is how it went unnoticed.
**ADR-038 — A sales invoice posts the journal and moves stock in one transaction — 2026-10-12**
Decision: `SalesService.createSalesInvoice` runs `PostingService.post()` and `StockService.record()` with the same `EntityManager`. If `StockService` refuses — the yard would go negative (ADR-026) — the whole invoice rolls back and the voucher number is not consumed.
Why: this is the core BRICS principle — an operation recorded at the kiln creates the stock movement AND the balanced journal in one database transaction. The alternative (post the journal first, then move stock) would let a journal survive without the goods leaving, so the Trial Balance would credit customers for shipments that never happened; the alternative in the other direction (move stock first, then post) would let a yard empty itself with no revenue booked. Both have been seen in Indian ERPs that treat the two steps as independent. Mirror of P7 (bill + GRN), proven under 476 e2e.

**ADR-039 — Loading and transport charges on a sales invoice are composite supply — 2026-10-12**
Decision: separate taxable lines on the invoice, taxed at whatever GST rate the user enters per charge. Default UX nudges the same rate as the brick line (what composite supply under GST s.8 requires). The three charge kinds (loading, transport, other) credit three distinct income ledgers — `LOADING_INCOME`, `FREIGHT_INCOME`, `OTHER_SALES_INCOME` — so the P&L reads each on its own row.
Why: the alternative — treating loading/transport as non-taxable reimbursements — needs agent-of-the-recipient documentation (bills raised in the customer's name, reimbursed at cost, nothing added) that brick kilns do not maintain. On a GST audit, the department reclassifies them as composite supply and raises a demand with interest. The declarative choice at invoice time keeps the owner correct by default. `LOADING_INCOME` and `OTHER_SALES_INCOME` were new as of P8; the migration backfills them onto every pre-P8 company so an invoice issued today does not fail with `LEDGER_NOT_FOUND`.

**ADR-040 — A credit note re-stocks if and only if the line carries a quantity — 2026-10-12**
Decision: on `createCreditNote`, each line decides for itself. If `quantity` is a positive number, bricks are physically back in the yard and `StockService.record(…, direction: 'in')` fires in the same transaction; if `quantity` is null, the line is a value-only adjustment (price error, damage allowance) and no stock movement is written. The parent `credit_notes.restocked` flag reflects whether any line triggered a stock IN. A credit note is refused if any quantity-bearing line omits the warehouse (`chk_credit_note_lines_warehouse_when_qty`).
Why: the alternative is a checkbox on the credit-note dialog. Checkboxes are forgotten; the shape of the data is not. "I entered a quantity" is already the owner telling the system that goods came back — asking a second time was redundant and introduced a path where the owner says "yes it came back" but there is nothing to re-stock. The database CHECK means the invariant is also protected against bypassing the service.

**ADR-041 — The bricks leave the yard exactly once, whichever document came first — 2026-10-12**
Decision: a sales invoice and a delivery challan can each be the thing that deducts finished stock, and exactly one of them does it for any given load. `dispatches.sales_invoice_id` records the invoice-first flow (the bill exists, so confirming the challan moves nothing); `sales_invoices.dispatch_id` records the challan-first flow (the truck left, so the invoice bills what already moved and its lines point at the challan's stock movement rather than writing new ones). Which path happened is stored on `dispatches.moved_stock`, not inferred later, and a CHECK refuses the impossible pair. Billing more than the challan carried is refused (`INVOICE_EXCEEDS_CHALLAN`); billing less is allowed and reported by LEK-04 as a quantity mismatch.
Why: a brick kiln runs both ways round. A known customer with a running account gets the truck first and the bill at month end; a walk-in pays against an invoice and then loads. ADR-038 had already made the invoice move stock, so a challan that also moved stock would have deducted the yard twice for one load — the single most expensive silent error this module could make, because stock drifts down with no document anyone can point at. Reversing the dispatch movement at link time was the alternative and was rejected: it leaves two stock rows per load in the register, which makes `Opening + In − Out = Closing` unexplainable line by line (the property P4 exists to protect). The two link columns point at each other, so `sales_invoices.dispatch_id` is `ON DELETE SET NULL` rather than RESTRICT — a pair of RESTRICTs is a cycle no delete order can satisfy, and rows are soft-deleted in production anyway.

**ADR-042 — Freight is income exactly once — 2026-10-12**
Decision: a trip may charge freight (Dr customer, Cr `FREIGHT_INCOME`), but not when the challan it carried is billed on an invoice that already carries a `transport` charge. `FREIGHT_ALREADY_BILLED` refuses it. A trip with no dispatch, or whose invoice charged no transport, books freely.
Why: P8 bills loading and transport on the invoice as composite supply (ADR-039), crediting the same `FREIGHT_INCOME` ledger. Without the guard, a kiln that bills transport on the invoice **and** logs the trip would credit the same rupee twice and report revenue it never earned — the mirror of the stock problem ADR-041 closed. The consequence is that VEH-07 reads a vehicle whose work is always billed on the invoice as pure cost; that is the honest answer, because the report says what the vehicle earned *as freight*, not what the loads it carried sold for.

**ADR-043 — Fuel from the kiln's own tank moves stock and posts no journal — 2026-10-12**
Decision: a diesel entry naming an item and a warehouse issues fuel from stock through `StockService` and writes **no** voucher; a diesel entry naming a cash/bank ledger or a party posts the expense journal and writes **no** stock. A CHECK (`chk_vehicle_expenses_stock_xor_voucher`) makes the two mutually exclusive at the database. The issue carries its own movement kind, `vehicle_fuel`, not `adjustment`.
Why: fuel bought into the tank was already expensed on its purchase bill, so booking `Dr VEHICLE_DIESEL` again on issue would charge the kiln twice for one tankful. ACCOUNTING_RULES already says pure stock events move quantity only and value enters via bills; this is that rule applied to fuel. `adjustment` was rejected as the movement kind because adjustments are reasoned corrections allowed to drive stock negative (ADR-026) and a routine issue is neither — putting them in the same bucket would make the adjustment register unreadable as a control.

**ADR-044 — The expense categories are the expense ledgers — 2026-10-12**
Decision: EXP-01 has no `expense_categories` table. `GET /expenses/categories` returns the company's own ledgers under `DIRECT_EXPENSES` and `INDIRECT_EXPENSES`, tagged `direct` or `indirect`. An owner who adds a ledger under either group has added a category. Two codes EXP-01 names and the P2 chart lacked — `MACHINERY_REPAIRS` and `FOOD_EXPENSES` — were added to `LEDGER_SEED` and backfilled onto every existing company by the migration.
Why: a separate category table would be a second list of the same thing, and the two would drift — a category with no ledger has nowhere to post, and a ledger with no category is invisible to the expense screen. The chart of accounts is already the authority on what the business spends money on, and the P&L reads from it either way. The cost is that "category" and "ledger" are the same object in the UI, which is in fact what an accountant expects.

**ADR-045 — A charge still owed is a journal, not a payment — 2026-10-12**
Decision: an expense paid from cash or bank posts a `payment` voucher; an expense on credit posts a `journal` crediting the party. The same split is in the vehicle charges (P9.1b).
Why: the cash book is built from payment and receipt vouchers against cash and bank ledgers. Posting an unpaid charge as a payment would put money in the cash book that never left the drawer, so the book would not tie to the physical cash — which is the one thing a cash book is for. The voucher type is the discriminator the Day Book and the cash book already read.

**ADR-046 — Unpriced closing stock is reported as unvalued, never as zero — 2026-10-12**
Decision: closing stock is quantity from the stock ledger times a rate the owner enters per grade for a valuation date (OQ #4's recorded default). A grade holding stock with no rate for that date is listed with `unvalued: true` and excluded from the total, and the P&L and Balance Sheet both carry an `unvaluedStockGrades` count on the face of the statement.
Why: valuing unpriced stock at zero understates both profit and assets without saying so, and the reader has no way to tell a yard that is genuinely empty from one nobody priced. This is ADR-037's principle applied to stock — a missing rate is surfaced, not invented. Only the rate is stored: the quantity always comes from `stock_movements`, so a valuation cannot disagree with the stock register.

**ADR-047 — Closing a year is not the same as locking it — 2026-10-12**
Decision: `financial_years` carries `closed_at`/`closed_by` alongside `is_locked`, and a CHECK enforces that a closed year is locked. Closing writes each asset and liability ledger's closing balance as the next year's opening balance, deactivates every other year and activates the next; income and expense ledgers are not carried, because they start each year at zero. A second close is refused with `FINANCIAL_YEAR_ALREADY_CLOSED`.
Why: locking is reversible — an owner may lock a year to stop entry and unlock it to fix something. Carrying balances is not: running it twice would double every opening balance, and the Balance Sheet would be wrong by a year with nothing on screen to show it. One boolean cannot express both states, and the flag that stops the double-carry has to be the one that records that the carry happened.

**ADR-048 — The GSTR-1 export is CSV, and "reconciled" means filable — 2026-10-12**
Decision: GST-04's export writes CSV, not a binary workbook; no spreadsheet dependency was added. GST-07 compares the register against the `OUTPUT_*` and `INPUT_*` ledger balances line by line and reports the difference per component, and it also counts invoices with **no HSN** — a month whose numbers agree but whose rows the portal would reject is reported as **not clean**.
Why: on the export, CSV opens in Excel, in the accountant's own tooling and in a text editor, and it diffs; a generated .xlsx adds a dependency whose output nobody can read without the app, for a file whose only job is to be pasted into the portal or handed to a CA. On the reconciliation, the client named "delayed GST reconciliation" as a problem BRICS exists to solve, and an owner who is told "reconciled" and then has the filing bounced for a missing HSN has been told something useless. Balanced and filable are different claims, and the report makes both.

**ADR-049 — CST-01 allocates kiln-month costs by fired share, not by key — 2026-10-13**
Decision: Cost per 1,000 is reported by **kiln × month × brick type**. Each kiln-month's seven cost buckets (labour, coal, soil, electricity, loading, repairs, other) are allocated across the brick types fired that month in proportion to each type's share of sorted good output. Labour reads the `LABOUR_WAGES` ledger directly rather than the wage accruals, so a manual journal (used by LAB-04 under the hood) and an accrual both show up. Overheads that carry no `site_id` on their voucher are not pulled into any kiln row — they stay on the P&L, not on cost-per-1,000. The ₹4,100 benchmark lives as `COST_PER_THOUSAND_BENCHMARK` in `@brics/shared` and is a constant for CP1; a per-company override is a CP2 candidate.
Why: a kiln fires every brick grade together in the same chamber. Direct expense ledgers like COAL and ELECTRICITY are not tagged to a brick type, and no reliable way exists to tag them without a second table nobody maintains. Choosing to allocate by fired share matches cost to volume honestly: if 90 % of October's fired bricks were Class 1, then Class 1 carries 90 % of October's coal — not a number computed from an invented key the owner cannot verify. Keeping unassigned overheads off the kiln rows means a `cost per 1,000` reading is "what this kiln spent per 1,000 bricks fired *here*" rather than a figure quietly inflated by head-office rent.


**ADR-050 — CST-01's realised price is the kiln-month's, not the grade's — 2026-10-13** *(superseded the same day by ADR-051 — the price is read per grade now that a grade is an item; the `null`-not-zero rule and the credit-note netting below still hold)*
Decision: cost per 1,000 carries `sellingPricePerThousand` and `grossMarginPercent` beside every row, but both are computed at **kiln × month** and repeated across that month's grades; `meta.realisationLevel` says so, and the screen says so in words. Revenue is the net movement on `SALES_BRICKS` for the kiln-month, so credit notes — returns and rate corrections alike — are already netted; the quantity is the invoiced quantity less the quantity on credit notes that carried one (ADR-040). A kiln-month that sold nothing reports `null`, never `0.00`.
Why: CST-01 asks for cost "vs selling price → gross margin", but a sales invoice line names an item and a warehouse and never a brick grade — production stocks bricks by `brick_type_id`, sales deduct by `item_id`. A per-grade price would have to be invented from a name match, and an owner would act on it. The kiln-month realisation is the finest cut the books actually support, and saying which figure is per grade and which is per kiln-month is what keeps the margin column honest. Per-grade pricing needs the grade on the sale itself, which is a schema change, not a report change.

**ADR-051 — A brick grade is an item — 2026-10-13**
Decision: `brick_types.item_id` ties each grade to exactly one item (unique, `ON DELETE RESTRICT`, required at creation and never changed afterwards). Every stock movement now names that item — `stock_movements.item_id` is NOT NULL and the old "item XOR grade" CHECK is gone — while `brick_type_id` stays on the row as the grade it was: descriptive, not what the balance is keyed on. `StockService` resolves either input to the item, refuses a pair that disagrees (`STOCK_SUBJECT_MISMATCH`), and locks and sums on the item. Reads that mean "bricks" ask whether the item is some grade's item rather than whether the movement carried a grade, because a sale names the item alone. The migration adopts an existing item of the same name per grade and creates one where there is none, so no company lands unable to invoice what it has fired.
Why: the yard had two ledgers for the same bricks. Production sorted into a grade; sales, dispatch and the closing-stock valuation all worked on items; nothing joined them. A kiln could fire 50,000 bricks and be refused a sale for want of stock, the dashboard's "bricks on hand" counted only the half production wrote, the valuation could not see fired stock at all, and CST-01 could not say what a grade fetched because the invoice never named one. Putting the grade on the sale instead was the other option and was rejected: GST, HSN and the unit all live on the item, so a sale has to name an item regardless, and a second subject would have meant two of everything downstream. One pile, one subject, with the grade carried alongside for the reports that are about grades.
