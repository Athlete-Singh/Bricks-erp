# M12 Supervisor Mobile App

**Purpose:** Offline-first Flutter app for the field: production, attendance, GRN, dispatch/delivery, sync.
**Phase:** M0–M6 (2026-10-22) · **Status:** ✅ built and tested; distributable builds wait on OQ #12, #22, #23

## Features
| ID | Feature | Step | Status |
|---|---|---|---|
| MOB-01 | Login (offline reopen), kiln selection, role-based home; suspended tenant told who to contact | M1 | ✅ |
| MOB-02 | Drift outbox + caches, SyncService, SyncStatusBadge, Sync screen | M1 | ✅ |
| MOB-03 | Production (PRD-06), attendance (LAB-02), GRN (PUR-02), dispatch + delivery (DSP-04) | M2–M5 | ✅ |
| MOB-04 | A full working day offline, no duplicates, conflict handling (test: `test/sync/full_day_offline_test.dart`) | M6 | ✅ |
| MOB-05 | Android release — signed APKs + .aab as `com.bricks.user` (`scripts/build_release.sh android`) | M6 | ✅ |
| MOB-06 | iOS release build — builds unsigned; TestFlight needs the client's Apple account | M6 | ⚠️ |

## Architecture (ADR-053)
- `mobile/lib/core/` — theme tokens, widgets, dio `ApiClient` (envelope + `ApiException` transient/refused split), `AuthInterceptor`
  (single-flight refresh; only a *refused* refresh ends the session), Drift `AppDatabase`, `sync/` (queue, cache, sender, puller, `RecordRef`).
- `mobile/lib/features/<auth|home|masters|production|attendance|grn|dispatch|sync>/{data,domain,presentation}`.
- Riverpod 3 hand-written providers; go_router with an auth redirect; l10n in `core/l10n/app_en.arb` (Hindi-ready, OQ #6).

## Local tables (Drift, on the phone)
- `sync_queue` — **the row is the field record**: id (client UUID = `Idempotency-Key`), entity, method, path (`{parent}` placeholder),
  payload, depends_on, status `pending|syncing|synced|failed`, attempts, next_attempt_at, last_error(_code), server_id, server_ref
  (challan/GRN no.), title, site_id, user_id, company_id, timestamps. Timestamps stored as ISO text with ms (FIFO within a second).
- `cached_records (kind, id, site_id, json)` — masters (delta by `?since=` where SYN-02 offers it) and the open batches / open challans.
- `app_state (key, value)` — watermarks `since.<kind>`, `site.selected`, `sync.lastAt`, `session.userId`.

## Sync rules (as built)
- Oldest first; a child waits for its parent (`depends_on`) and goes to the parent's server id. A delivery waits on a queued gate-out.
- Network / timeout / 5xx / 429 → retry 5 s → 30 s → 2 min → 10 min; regaining signal sends at once. 4xx → `failed` with the
  server's reason; the person corrects it (same key — a refused attempt never stored it), sends again, or discards (with dependants).
- 401 → the entry waits for the same person; a refused refresh signs out but keeps the queue. Entries only go with their author's token.
- PATCH confirm / acknowledge are not idempotent on the server: a resend refused with `DISPATCH_NOT_DRAFT` / `DISPATCH_ALREADY_DELIVERED`
  is settled by reading the challan back.
- Sent entries are pruned after 30 days; sign-out wipes the phone (after warning about unsent entries).

## Endpoints used
`POST /auth/login|refresh|logout` · `GET /sites, /parties, /inventory/{units,items,brick-types,warehouses}, /labour/{groups,workers},
/transport/{vehicles,drivers}` · `GET|POST /production/batches`, `GET /production/batches/:id`, `POST …/:id/{making,drying,firing,sorting}` ·
`POST /labour/attendance` · `POST /purchases/goods-receipts` · `GET|POST /dispatches`, `GET /dispatches/:id`, `PATCH …/:id/{confirm,acknowledge}`.

## Postings
None on the phone — the server posts stock and journals when it takes an entry.

## Verified against a real API (2026-10-22)
`mobile/integration/live_api_test.dart` (runs only with `LIVE_API_URL`): the app's own SyncService, repositories and payload
builders against a local BRICS API on Postgres 16 — batch + making/drying/firing, a two-worker roll with overtime, a GRN, a
challan with gate-out and delivery — all accepted, in order; every create resent with its key returned the original id; a
resent gate-out settled as done; a duplicate stage came back as `PRODUCTION_STAGE_DUPLICATE`, refused.

## Known gaps / notes
- Roles: the app shows what the role may do; no role widened. Supervisor = production + dispatch (works challans raised on the
  web; no `parties.view`, so no customer names and no "New challan"). Attendance needs `labour.manage`, GRN `purchases.manage`.
- GRN does not link a purchase order from the phone (optional on the API) — CP2 candidate if the client asks.
- A production stage or dispatch step, once on the server, is corrected on the web (server rule: immutable).
- Release: `applicationId com.brics.brics_mobile` is a placeholder (OQ #12); release API URL and Android keystore custody (OQ #22);
  Apple developer account for TestFlight (OQ #23).
