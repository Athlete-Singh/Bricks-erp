# M12 Supervisor Mobile App

> Status: **Built (M0–M6, 2026-10-22)** — Android and iOS release builds compile; store release waits on the
> package id (OQ #12), the production API address and signing key (OQ #22), and the client's Apple account (OQ #23).
> Code: `mobile/` · Tracker: [13-roadmap-and-status.md](../13-roadmap-and-status.md) · Sync design: [09-offline-sync.md](../09-offline-sync.md)

## Purpose

The supervisor at the kiln records the day's work on a phone, with or without signal: production stages, the muster roll,
goods arriving, and bricks leaving. Everything is saved on the phone first and sent to the server when there is network.

## Scope (MVP depth)

| ID     | Feature                                                                   | Status                                               |
| ------ | ------------------------------------------------------------------------- | ---------------------------------------------------- |
| MOB-01 | Sign in, choose the kiln, home screen with only the tasks the role may do | ✅                                                   |
| MOB-02 | Offline storage, sync queue, sync status badge and Sync screen            | ✅                                                   |
| MOB-03 | Production, attendance, goods receipt, dispatch + delivery                | ✅                                                   |
| MOB-04 | A full day offline; syncs with no duplicates; conflicts handled           | ✅                                                   |
| MOB-05 | Android release APK                                                       | 🟨 builds; needs the API address and the signing key |
| MOB-06 | iOS build + TestFlight                                                    | ⚠️ builds unsigned; needs the client's Apple account |

## Screens

Sign in · Choose kiln · Home · Production (open batches, new batch, batch with its four stages, stage forms) ·
Attendance (gang, date, a mark per worker) · Goods receipt · Dispatch (open challans, new challan, challan, gate out,
record delivery) · Sync (everything on the phone and where it stands).

## How it works

- **Sign in once with signal.** After that the app opens without network, from the session stored on the phone.
- **Which tasks appear** follows the role's permissions: production needs `production.manage`, attendance `labour.manage`,
  goods receipt `purchases.manage`, dispatch `dispatch.manage` or `dispatch.acknowledge`. The server checks again on every send.
- **Saving** writes the entry to the phone and puts it in the queue. The badge on every screen says _All sent_, _N waiting_,
  _Offline_ or _N need attention_.
- **Sending** happens on its own: when the entry is saved, when the network returns, when the app is reopened, and every
  30 seconds while something is due. Each entry carries its own id as the `Idempotency-Key`, so a resend after a lost
  answer returns the first result instead of creating a second batch, GRN or challan.
- **Order is kept.** A stage recorded on a batch that has not reached the server yet waits for it; a delivery waits for
  the gate-out. Entries go oldest first.
- **Refused entries** (the server read it and said no — a date in the future, a stage out of order, a second roll for the
  same gang and day) are marked _Needs attention_ with the server's reason. The supervisor can correct and resend, send
  again unchanged, or discard.
- **Masters** (kilns, parties, items, grades, stores, gangs, workers, vehicles, drivers) are read-only copies, refreshed
  after each send; the five SYN-02 lists only fetch what changed.

## Accounting effect

None on the phone. Stock and journals are posted by the server, in one transaction, when it accepts an entry — exactly as
when the same entry is made on the web.

## How to test

- `cd mobile && dart run build_runner build -d && flutter analyze && flutter test` — 73 tests, including a full working day
  entered offline and synced over a connection that loses answers and returns a 503 (`test/sync/full_day_offline_test.dart`).
- On a phone or emulator with the API running: `flutter run --dart-define-from-file=env/dev.json`. Sign in as a supervisor,
  turn on airplane mode, start a batch and record making, take a roll, then turn airplane mode off — the badge goes from
  _2 waiting_ to _All sent_, and the batch appears on the web.
- Release: `API_BASE_URL=https://<api>/api/v1 scripts/build_release.sh android` (or `ios`). See `mobile/README.md`.
