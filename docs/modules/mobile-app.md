# M12 Supervisor Mobile App

> Status: **Planned (not started)** · Build phase: P1, P5–P9, P12
> Scope source: `docs/client-requirements/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md)

## Purpose
Offline-first Flutter app for supervisors: production, attendance, GRN, dispatch/delivery, sync.

## Planned scope (MVP depth)
| ID | Feature | Phase | Status |
|---|---|---|---|
| MOB-01 | Login, kiln selection, role-based home | P1 | ⬜ |
| MOB-02 | Offline storage + sync queue + sync status badge (skeleton) | P1 | ⬜ |
| MOB-03 | Feature screens: production (P5), attendance (P6), GRN (P7), dispatch/delivery (P9) | P5–P9 | ⬜ |
| MOB-04 | A full working day offline; syncs with no duplicates; conflict handling | P12 | ⬜ |
| MOB-05 | Android release APK | P12 | ⬜ |

## Data
Planned tables: (local Drift) sync_queue + per-feature tables; server idempotency_keys

## Screens
Mobile: login, kiln select, home, production, attendance, GRN, dispatch, sync status.

## Accounting effect
None directly — server posts on sync.

## How it works
_(Filled in when the module is built: flows, rules, examples.)_

## How to test
_(Filled in when built.)_
