# 01 — Overview

## The problem
Brick kiln and chimney businesses lose money through stock leakage, manual record manipulation, unmonitored cash advances to Sardars and labour, coal/diesel pilferage and late GST reconciliation. Generic accounting tools don't follow the physical cycle (Soil → Green bricks → Firing → Sorted stock).

## The solution
**BRICS**, by TVAM KEY SOFTWARE PRIVATE LIMITED, is one system for the whole business. What a supervisor records at the kiln updates stock **and** the books automatically, so the owner sees true stock, cash, dues and the real **cost per 1,000 bricks**.

| App | Who | What |
|---|---|---|
| Owner & Admin web panel | Owner, accountant, manager, sales, store | Full ERP, accounting, GST, reports, dashboard |
| Supervisor mobile app (works offline) | Supervisor, production manager, driver | Brick counts, attendance, material receipts (GRN), dispatch challans, delivery updates |
| Backend API | — | Business rules, stock engine, accounting engine, security |

## Client phases (what the client gets, and when)
**Client Phase 1: MVP.** Everything needed to run the daily business: company and kilns, users and roles, parties, production, labour and Sardar wages/advances, inventory, purchases, GST sales invoices, dispatch, transport, expenses, cash and bank, full books (Day Book to Balance Sheet), GSTR-1/3B registers, owner dashboard with cost per 1,000 bricks, and the offline supervisor app. Simple and correct, not over-built.

**Client Phase 2: Advanced.** AI anomaly alerts (coal efficiency), IoT (weighbridge, kiln thermal sensors), and advanced extras: bank reconciliation, cheque tracking, cash flow statement, deeper profitability and leakage analysis, a permission editor, in-app backup. Approved add-ons such as e-invoice, WhatsApp alerts and Hindi may be added here.

**Not included (per SOW):** SMS/WhatsApp gateway fees, App/Play Store fees, hardware, and entering previous years' paper records.

The full feature list with status is in [13-roadmap-and-status.md](13-roadmap-and-status.md).

## Modules
Company & Admin · Parties · Production · Labour & Sardar · Inventory · Vehicle & Transport · Purchases · Sales & Invoicing · Dispatch · Accounting · GST · Supervisor app · Expenses · Cash & Bank · Dashboard & Costing. See [modules/](modules/).

## Example economics (per 1,000 bricks, client benchmark)
Labour ₹1,200 · Coal ₹1,700 · Soil ₹500 · Electricity ₹150 · Loading ₹250 · Repairs ₹150 · Other ₹150 → **Cost ₹4,100**, selling price ₹6,500, **margin ₹2,400 (36.9%)**.
