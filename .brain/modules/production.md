# M03 Production

**Purpose:** Soil → brick making → drying → firing → sorting → finished stock, by kiln/chamber/grade, with fuel consumption.
**Phase:** P5 (PRD-01 in P3) · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3) | P3 | ⬜ |
| PRD-02 | Production batch per kiln + chamber + date | P5 | ⬜ |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | P5 | ⬜ |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock | P5 | ⬜ |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded | P5 | ⬜ |
| PRD-06 | Production entry on mobile (offline) | P5 | ⬜ |
| PRD-07 | Production report: day / month / year by kiln and grade | P5 | ⬜ |

## Tables (planned)
brick_types, production_batches, production_entries, production_wastage, fuel_consumptions

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Web: batches, stage entry, production report. Mobile: offline production entry.

## Postings
Quantity only (stock in good bricks, stock out coal/soil). Wages via Labour module.

## Known gaps / notes
-
