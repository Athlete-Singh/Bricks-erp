#!/usr/bin/env bash
# ADM-09 — prove a backup can be restored, by restoring it into an EMPTY
# scratch database and checking the books there (docs/17-backup-and-restore.md).
#
#   RESTORE_DATABASE_URL=postgresql://…/scratch  scripts/db/restore-drill.sh backups/brics-….dump
#
# Never point RESTORE_DATABASE_URL at production. The script refuses a target
# that is the same as DATABASE_URL / DATABASE_DIRECT_URL / BACKUP_DATABASE_URL,
# and refuses any target that already has tables in it.
set -euo pipefail

dump="${1:-}"
target="${RESTORE_DATABASE_URL:-}"
here="$(cd "$(dirname "$0")" && pwd)"

[[ -f "$dump" ]] || { echo "Usage: RESTORE_DATABASE_URL=… $0 <file.dump>" >&2; exit 1; }
[[ -n "$target" ]] || { echo "Set RESTORE_DATABASE_URL to an empty scratch database." >&2; exit 1; }
for live in "${DATABASE_URL:-}" "${DATABASE_DIRECT_URL:-}" "${BACKUP_DATABASE_URL:-}"; do
  if [[ -n "$live" && "$live" == "$target" ]]; then
    echo "Refusing: RESTORE_DATABASE_URL is a live database. Use a scratch one." >&2
    exit 1
  fi
done

if [[ -f "$dump.sha256" ]]; then
  (cd "$(dirname "$dump")" && shasum -a 256 -c "$(basename "$dump").sha256" >/dev/null) \
    || { echo "Checksum mismatch — the dump is damaged." >&2; exit 1; }
  echo "Checksum OK"
fi

tables="$(psql "$target" -tAc "select count(*) from information_schema.tables where table_schema = 'public'")"
if [[ "$tables" != "0" ]]; then
  echo "Refusing: the target already has $tables tables. Restore drills go into an empty database." >&2
  exit 1
fi

start=$SECONDS
pg_restore --no-owner --no-privileges --exit-on-error --dbname="$target" "$dump"
echo "Restored in $((SECONDS - start)) s"

psql "$target" -v ON_ERROR_STOP=1 -q -f "$here/verify-restore.sql"
echo "Restore drill passed."
