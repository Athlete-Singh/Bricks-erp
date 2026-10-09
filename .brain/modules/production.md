# M03 Production

**Purpose:** Soil → brick making → drying → firing → sorting → finished stock, by kiln/chamber/grade, with fuel consumption.
**Phase:** P5 · **Status:** 🟨 batches, stages and sorting live (P5.1a); fuel/soil consumption and LEK-02 pending (P5.1b)

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| PRD-01 | Brick types / grades master (configurable, e.g. Class 1/2/3) | P3 | ✅ |
| PRD-02 | Production batch per kiln + chamber + date | P5.1a | ✅ |
| PRD-03 | Stage entries: brick making (green bricks, labour group) → drying → firing (chamber, fuel) → sorting (fired, broken/rejected, good by grade) | P5.1a | 🧩 BE done; **fuel consumed at firing lands in P5.1b** |
| PRD-04 | Fuel/raw material consumption (coal, soil) reduces raw stock | P5.1b | ⬜ |
| PRD-05 | Sorted good bricks enter finished stock by grade; wastage recorded | P5.1a | ✅ |
| PRD-06 | Production entry on mobile (offline) | M2 | ⬜ |
| PRD-07 | Production report: day / month / year by kiln and grade | P5.2 | ⬜ |
| LEK-01 | Brick yield variance report (green − good − broken − rejects, with "unexplained") | P5.1a | ✅ (BE) |

## Tables
- **production_batches** — one chamber on one date in one kiln. Unique (company, site, chamber, batch_date). Status walks `open → firing → sorted`.
- **production_entries** — one row per `(batch, stage)` where stage ∈ `making | drying | firing | sorting`. CHECK keeps each stage's counts in its own columns, so LEK-01 reads without guessing.
- **production_sorting_outputs** — one row per good brick grade a sorting entry produced, pointing at the exact `stock_movements` row written in the same transaction.

## Endpoints
- `POST /production/batches` — open a batch (production.manage)
- `GET /production/batches` — list, filtered by kiln / chamber / status / dates (production.view)
- `GET /production/batches/:id` — detail: batch + stage entries + sorting outputs (production.view)
- `POST /production/batches/:id/making` — record green bricks moulded; optional Sardar party (production.manage)
- `POST /production/batches/:id/drying` — mark drying stage done (production.manage)
- `POST /production/batches/:id/firing` — record fired count; flips batch to `firing` (production.manage)
- `POST /production/batches/:id/sorting` — classify into grades + broken + rejects; good → stock IN per grade **in the same transaction** (production.manage)
- `GET /production/yield-variance` — LEK-01, grouped by batch / chamber / Sardar (production.view)

## Screens (planned)
Web: batches list, batch detail with stage drawer, yield variance report (P5.2). Mobile: offline production entry (M2, needs SYN-01 from P5.1c).

## Postings
Quantity only. Sorting IN per grade → `stock_movements` with `movement_type='production'`, `source_type='production_batch'`. Fuel OUT lands in P5.1b with the coal/soil work.

## Rules worth not forgetting
- Stages are a chain: `making → drying? → firing → sorting`. `drying` is optional in the DB (not a prereq for `firing`) but still unique per batch.
- Each `(batch, stage)` is unique — correction is reversal, not an edit.
- Sorting writes stock through `StockService.record(manager, ...)` inside the batch's transaction. If `StockService` refuses one grade, the whole sorting rolls back and the batch stays `firing`.
- Rejects and broken are **counts only**, not stock movements — there is no prior stock-in to take them out of (ADR-???: wastage as a count, not a movement).
- `BRICK_TYPE_NOT_FOUND` fires at **422** if any grade belongs to another company, before any stock write (ADR-021).

## Known gaps / notes
- SYN-01 idempotency not yet applied to the create endpoints — scheduled for P5.1c, before M2 begins.
- No admin ability to reopen a `sorted` batch; a mistake is a reversal from the stock side (that reversal path lands with P9/P7 dispatch work).
