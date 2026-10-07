# M05 Inventory & Stock

> Status: **Planned (not started)** · Build phase: P4 (INV-01/02 in P3)
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Items, warehouses, opening stock, single StockService movement ledger, adjustments, stock reports.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| INV-01 | Items master: raw materials (soil, coal, sand, diesel), consumables, machinery/electrical/repair items; units; HSN | P3 | ⬜ |
| INV-02 | Warehouses / stock locations per kiln | P3 | ⬜ |
| INV-03 | Opening stock entry | P4 | ⬜ |
| INV-04 | Stock movement ledger via a single `StockService` (every in/out linked to its source document) | P4 | ⬜ |
| INV-05 | Automatic updates from GRN, production, dispatch and wastage (wired in P5/P7/P9) | P4 | ⬜ |
| INV-06 | Manual stock adjustment with reason (restricted role) | P4 | ⬜ |
| INV-07 | Stock reports: current stock by kiln/grade/item, movement register, Opening + Production + Purchase − Sales − Wastage = Closing | P4 | ⬜ |

## Data
Planned tables: items, units, warehouses, stock_movements, stock_balances, stock_adjustments

## Screens
Web: items, warehouses, opening stock, adjustments, stock summary, movement register.

## Accounting effect
Quantity only; valuation at period end (OQ #4).

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
