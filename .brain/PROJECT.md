# PROJECT — BRICS ERP

**What:** ERP + double-entry accounting for brick kiln/chimney businesses.

> **Ownership note (2026-10-08):** the three PDFs in `docs/client-requirements/` carry TVAM KEY SOFTWARE PRIVATE LIMITED's
> branding because they were produced by them, but **TVAM Key is the intermediary who passed this work on — not the owner,
> parent company or publisher of BRICS.** Do not describe BRICS as "by" them anywhere, and do not take their name for the
> mobile package id, the app's branding or any copyright line. The PDFs themselves stay untouched; they are source documents.
> Who owns and publishes the product is still unanswered — OPEN_QUESTIONS #12.
**Core principle:** an operation recorded at the kiln auto-creates the stock movement AND the balanced journal, in one DB transaction. BRICS = single source of truth.
**Client pain:** leakage, manual record manipulation, untracked Sardar advances, coal/diesel pilferage, late GST reconciliation. ROI pitch: save ₹3.5–6 L per season per kiln (5–8% leakage).
**Scope docs:** `docs/client-requirements/` — 03-sow-srs.pdf is the contract.

## Client phases
- **CP1 = MVP** = SOW modules 1–12 at basic depth → client runs daily business end-to-end. Internal steps P0–P13.
- **CP2 = Advanced** = AI anomaly (13), IoT weighbridge/thermal (14) + Functional-Spec extras (bank reco, cheques, cash flow, profitability comparisons, leakage, permission editor, backup UI). Internal A1–A7.
- Excluded by SOW: SMS/WhatsApp gateway fees, store fees, hardware, historical data entry.

## Apps & users
- **Web (owner/admin panel):** Owner, Accountant, Manager, Sales Executive, Store Keeper — full ERP + accounting.
- **Mobile (supervisor app, offline-first):** Supervisor, Production Manager, Driver — production count, attendance, GRN, dispatch challan, delivery update.
- **Roles (9):** Super Admin, Owner, Accountant, Manager, Production Manager, Supervisor, Sales Executive, Store Keeper, Driver + granular permission codes.

## Domain lifecycle
- Production: Soil → Brick making (green bricks) → Drying → Firing (chamber, coal) → Sorting (good by grade / broken) → Finished stock
- Labour: Attendance → Production count → Wage (per 1,000) → Advance → Payment → Seasonal settlement
- Purchase: PO → GRN → Supplier bill → Stock → Payment
- Sales: Quotation → SO → GST invoice → Dispatch/Challan → Receipt → Customer ledger
- Inventory: Opening + Production + Purchase − Sales − Wastage = Closing
- Transport: Vehicle → Trip → Diesel → Delivery → Transport cost/income
- Accounting: Transactions → Vouchers → Ledgers → TB → P&L → BS
- Benchmark cost / 1,000 bricks: labour 1,200 · coal 1,700 · soil 500 · electricity 150 · loading 250 · repairs 150 · other 150 = **4,100**; sell 6,500 → margin 2,400 (36.9%)

## Modules (feature-ID prefix)
M01 Company/Auth/RBAC (ADM) · M02 Parties (PTY) · M03 Production (PRD) · M04 Labour & Sardar (LAB) · M05 Inventory (INV) · M06 Vehicle & Transport (VEH) · M07 Purchases (PUR) · M08 Sales (SAL) · M09 Dispatch (DSP) · M10 Accounting (ACC) · M11 GST (GST) · M12 Supervisor app (MOB) · Expenses (EXP) · Cash & Bank (CSH) · Dashboard (DSH) · Costing (CST) · Reports (RPT) · Onboarding (ONB) · CP2: AI, IOT, ADV

## Stack
Backend NestJS + TypeORM + PostgreSQL 16 (Supabase prod) · Web Next.js 14 App Router + React 18 + TS strict + Tailwind + TanStack Query + Zustand + RHF/Zod · Mobile Flutter + Riverpod + go_router + dio + freezed + Drift · pnpm + Turborepo · Node 24 LTS · Hosting Render / Vercel / Supabase.

## Repo map
`backend/` API · `web/` panel · `mobile/` Flutter · `packages/shared` TS types/Zod/enums · `packages/config` tsconfig/prettier presets · `infra/` docker-compose · `scripts/` · `docs/` human docs · `.brain/` AI memory.

## Key business rules
- Multi-tenant: every business row has `company_id`; enforced server-side from the JWT, never from client input.
- Money `NUMERIC(18,2)` + decimal libs; brick qty integer; rates "per 1,000 bricks".
- Posted vouchers immutable → reversal / credit-debit note. FY April–March, lockable.
- GST: intra-state CGST+SGST, inter-state IGST (place of supply = buyer state vs company state). Rates/HSN are data.
- Stock changes only via StockService. Mobile writes are idempotent (client UUID).
