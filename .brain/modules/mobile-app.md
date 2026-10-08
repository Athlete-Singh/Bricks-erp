# M12 Supervisor Mobile App

**Purpose:** Offline-first Flutter app for supervisors: production, attendance, GRN, dispatch/delivery, sync.
**Phase:** P1, P5–P9, P12 · **Status:** ⬜ not started

## Features
| ID | Feature | Phase | Status |
|---|---|---|---|
| MOB-01 | Login, kiln selection, role-based home | P1 | ⬜ |
| MOB-02 | Offline storage + sync queue + sync status badge (skeleton) | P1 | ⬜ |
| MOB-03 | Feature screens: production (P5), attendance (P6), GRN (P7), dispatch/delivery (P9) | P5–P9 | ⬜ |
| MOB-04 | A full working day offline; syncs with no duplicates; conflict handling | P12 | ⬜ |
| MOB-05 | Android release APK | P12 | ⬜ |

## Tables (planned)
(local Drift) sync_queue + per-feature tables; server idempotency_keys

## Endpoints
_(none yet — add one line each, mirror in API_INDEX.md)_

## Screens (planned)
Mobile: login, kiln select, home, production, attendance, GRN, dispatch, sync status.

## Postings
None directly — server posts on sync.

## Known gaps / notes
-

## Build track (added 2026-10-08)
The Flutter app is **not** built on the backend/web machine — no Flutter SDK there, and none will be installed.
Steps **M0 → M6** in `PROGRESS.md` run on a separate machine. The P track is never blocked by it.

| Step | Scope | Waits for |
|---|---|---|
| M0 | `flutter create`, packages, theme, core widgets, go_router, dio, Drift stub, l10n | — |
| M1 | Login, kiln select, sync-queue skeleton | P1.1b ✅ (APIs ready now) |
| M2 | Production entry offline | P5.1 **incl. SYN-01** |
| M3 | Attendance offline | P6.1 |
| M4 | GRN offline | P7.1 |
| M5 | Dispatch + delivery acknowledgement | P9.1 |
| M6 | Offline hardening, Android APK, **iOS build (MOB-06, contracted in SOW §1)** | all |

## The contract the backend owes mobile (build it with the module, not afterwards)
1. **`Idempotency-Key` on every create endpoint the app calls** (`SYN-01`, scheduled in P5.1). The app queues entries offline and
   resends on reconnect; without this, one retry = one duplicate production entry / GRN / dispatch. Key = the client-generated
   row UUID; a repeat returns the original result, it does not create a second row.
2. **Delta pull** (`?since=`) for cached masters: kilns, parties, items, brick types, wage rates (`SYN-02`).
3. **Lean payloads** on anything the app calls — field connections are poor.
4. **Money as strings**, brick quantities as integers (CONVENTIONS) — Dart `decimal` on the other side.
5. The envelope is `{ data }` / `{ data, meta }`; errors are `{ error: { code, message, details? } }`. Validation failures are
   400 `VALIDATION_FAILED` with a `details` array of `{ field, message }`.

## APIs ready for the app today
`POST /auth/login` · `POST /auth/refresh` · `POST /auth/logout` · `GET /auth/me` · `GET /sites` (returns only the kilns that
user may work on) · `POST /auth/change-password`. All tenant-scoped and tested — see `API_INDEX.md`.

## Why the field app matters more than it looks
The green-brick count entered at moulding is the number that **pays the labour** and **measures the yield** (`LEK-01`).
If it is written on paper and typed in the office later, the control is gone before it reaches the system. Same for coal
issued to the kiln (`LEK-02`). Offline-first is not a convenience here — it is what makes the measurement trustworthy.

