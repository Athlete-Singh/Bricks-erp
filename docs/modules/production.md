# M03 Production

> Status: **Planned (not started)** · Build phase: P5 (PRD-01 in P3)
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Soil → brick making → drying → firing → sorting → finished stock, by kiln/chamber/grade, with fuel consumption.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3) | P3 | ⬜ |
| PRD-02 | Production batch per kiln + chamber + date | P5 | ⬜ |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | P5 | ⬜ |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock | P5 | ⬜ |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded | P5 | ⬜ |
| PRD-06 | Production entry on mobile (offline) | P5 | ⬜ |
| PRD-07 | Production report: day / month / year by kiln and grade | P5 | ⬜ |

## Data
Planned tables: brick_types, production_batches, production_entries, production_wastage, fuel_consumptions

## Screens
Web: batches, stage entry, production report. Mobile: offline production entry.

## Accounting effect
Quantity only (stock in good bricks, stock out coal/soil). Wages via Labour module.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
