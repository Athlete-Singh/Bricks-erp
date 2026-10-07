# M05 Inventory & Stock

**Purpose:** Items, warehouses, opening stock, single StockService movement ledger, adjustments, stock reports.
**Phase:** P4 (INV-01/02 in P3) · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| INV-01 | Items master: raw materials (soil, coal, sand, diesel), consumables, machinery/electrical/repair items; units; HSN | P3 | ⬜ |
| INV-02 | Warehouses / stock locations per kiln | P3 | ⬜ |
| INV-03 | Opening stock entry | P4 | ⬜ |
| INV-04 | Stock movement ledger via a single `StockService` (every in/out linked to its source document) | P4 | ⬜ |
| INV-05 | Automatic updates from GRN, production, dispatch and wastage (wired in P5/P7/P9) | P4 | ⬜ |
| INV-06 | Manual stock adjustment with reason (restricted role) | P4 | ⬜ |
| INV-07 | Stock reports: current stock by kiln/grade/item, movement register, Opening + Production + Purchase − Sales − Wastage = Closing | P4 | ⬜ |

## Tables (planned)
items, units, warehouses, stock_movements, stock_balances, stock_adjustments

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: items, warehouses, opening stock, adjustments, stock summary, movement register.

## Postings
Quantity only; valuation at period end (OQ #4).

## Known gaps / notes
-
