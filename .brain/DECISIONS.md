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