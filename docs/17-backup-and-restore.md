# 17 — Backup and restore (ADM-09)

The books, the stock ledger and the labour records of every kiln live in one
PostgreSQL database. This page is what keeps them, and — more to the point —
how we know we can get them back.

**The rule:** a backup counts only once it has been restored. "Backups are
enabled" is not the same claim as "we can get the data back", and the
difference only shows on the worst day.

## Three layers

| Layer               | What                                                                                              | How often                        | Who                         |
| ------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------- | --------------------------- |
| 1. Provider backups | The database host's own scheduled backups (below)                                                 | Daily, automatic                 | Turned on once by the owner |
| 2. Off-site dump    | `scripts/db/backup.sh` — a logical dump the owner keeps outside the provider                      | Weekly, and before every release | Owner or whoever deploys    |
| 3. Restore drill    | `scripts/db/restore-drill.sh` — restore a dump into an empty scratch database and check the books | Monthly, and before go-live      | Whoever deploys             |

Targets: lose at most **one day** of entries (RPO 24 h; minutes with
point-in-time restore), back in service within **two hours** (RTO 2 h). The
supervisor app helps on the first: entries still on the phones are re-sent
after a restore, and the server's idempotency keys stop them doubling.

## 1. Provider backups — turn them on

The deployment docs name **Supabase**; `backend/.env.production.example` names
**Neon**. Whichever hosts production:

- **Supabase** — daily backups need the **Pro plan** (the free plan has none).
  Project → Database → Backups shows them. Point-in-time recovery is an add-on;
  worth it once the kiln runs daily on the system.
- **Neon** — every plan keeps a restore window (history retention); set it to
  at least 7 days under Project settings → Storage. A restore is a new branch
  from a past moment, which can be checked before anything is switched over.

Confirm it is on by finding yesterday's backup in the dashboard. Note the date
in the drill log below.

## 2. Off-site dump

```bash
# Direct connection string (port 5432), not the pooler.
BACKUP_DATABASE_URL='postgresql://…' scripts/db/backup.sh            # → backups/brics-<UTC>.dump + .sha256
BACKUP_KEEP=8 BACKUP_DATABASE_URL='…' scripts/db/backup.sh /Volumes/BRICS-BACKUP
```

- Needs the PostgreSQL client tools at the **same or newer** major version than
  the server (`brew install postgresql@16`, or `@17` if the host runs 17).
- The script checks the archive is readable, writes a SHA-256 next to it, and
  keeps the newest 14 (`BACKUP_KEEP`).
- **The dump is the company's books.** Keep it on an encrypted drive or in
  storage only the owner can open — never in chat, email or this repository
  (`backups/` is git-ignored).

## 3. Restore drill

```bash
# An EMPTY scratch database: a new Supabase project, a Neon branch, or a local Postgres.
RESTORE_DATABASE_URL='postgresql://…/scratch' scripts/db/restore-drill.sh backups/brics-<UTC>.dump
```

The drill:

1. checks the dump against its SHA-256;
2. refuses a target that is a live database (same URL as `DATABASE_URL`,
   `DATABASE_DIRECT_URL` or `BACKUP_DATABASE_URL`) or that already has tables;
3. restores, and times it;
4. runs `scripts/db/verify-restore.sql`: the latest migration, row counts of the
   core tables, **every voucher still balancing** and the books' total Dr = Cr,
   and at least one user who can sign in. Any breach fails the drill.

Then, against the restored copy, sign in on the web and open the Trial Balance
and the Day Book for the last day in the dump.

## A real restore

1. **Stop writes.** Put the API in maintenance (scale the service to zero) so
   nobody enters into a database about to be replaced. Phones keep queuing.
2. **Restore into a new database**, never over the damaged one: the provider's
   restore (Supabase: restore a daily backup / PITR into the project or a new
   one; Neon: branch from the moment before the problem), or `pg_restore` of
   the latest off-site dump into a fresh database.
3. **Check it** with `psql "$NEW_URL" -f scripts/db/verify-restore.sql`.
4. If the restored copy is older than the running code, run migrations
   against it: `pnpm --filter @brics/backend migration:run`.
5. **Point the API at it** (`DATABASE_URL`, `DATABASE_DIRECT_URL`), start the
   service, sign in, read the Trial Balance.
6. Phones re-send what they still hold; the Sync screen on each shows it
   arriving. Entries made between the backup and the failure that are **not**
   on a phone (web entries) must be re-entered from the paper trail — the Day
   Book of the restored copy shows exactly where it stops.
7. Record it in the log below.

## Drill log

| Date       | Backup                                 | Target                    | Result                                                             | Restore time | By                     |
| ---------- | -------------------------------------- | ------------------------- | ------------------------------------------------------------------ | ------------ | ---------------------- |
| 2026-10-22 | Local test database (backend e2e data) | Local scratch Postgres 16 | Passed — scripts verified, guards verified; **not yet production** | < 1 min      | Claude (build session) |

**ADM-09 is done when** the provider backups are on and one drill from a
**production** backup is in this log.
