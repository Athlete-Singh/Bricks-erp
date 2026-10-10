# M03 Production

> Status: **Backend complete through P5.1b** — batches, stages, sorting, consumption, LEK-01, LEK-02; web and mobile pending.
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose

Soil → brick making → drying → firing → sorting → finished stock, by kiln/chamber/grade, with fuel consumption.

## Planned scope (MVP depth)

| ID     | Feature                                                                                                                                      | Phase | Status |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ----- | ------ |
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3)                                                                                 | P3    | ✅     |
| PRD-02 | Production batch per kiln + chamber + date                                                                                                   | P5.1a | ✅ BE  |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | P5.1a | ✅ BE  |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock                                                                                 | P5.1b | ✅ BE  |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded                                                                           | P5.1a | ✅ BE  |
| PRD-06 | Production entry on mobile (offline)                                                                                                         | M2    | ⬜     |
| PRD-07 | Production report: day / month / year by kiln and grade                                                                                      | P5.2  | ⬜     |

## Data

Tables: `brick_types`, `production_batches`, `production_entries`, `production_sorting_outputs`, `production_consumptions`. Wastage is a count on `production_entries` (broken + rejects), not a separate table — there is no prior stock-in for it to come out of.

## Screens

Web: batches, stage entry, production report. Mobile: offline production entry.

## Accounting effect

Quantity only (stock in good bricks, stock out coal/soil). Wages via Labour module.

## How it works

_(Filled in when the module is built: flows, rules, examples.)_

## How to test

_(Filled in when built.)_
