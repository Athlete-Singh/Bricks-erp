#!/usr/bin/env bash
# ADM-09 — an off-site, logical backup of the BRICS database, on top of the
# provider's own scheduled backups (docs/17-backup-and-restore.md).
#
#   BACKUP_DATABASE_URL=postgresql://…  scripts/db/backup.sh [out-dir]
#
# Use the DIRECT connection string (port 5432), not the pooler: pg_dump needs a
# session the pooler does not give it. Falls back to DATABASE_DIRECT_URL.
# Writes backups/brics-<UTC time>.dump (+ .sha256), keeps the newest
# BACKUP_KEEP (default 14). The dump holds the company's books — store it the
# way you would store the books.
set -euo pipefail

url="${BACKUP_DATABASE_URL:-${DATABASE_DIRECT_URL:-}}"
if [[ -z "$url" ]]; then
  echo "Set BACKUP_DATABASE_URL (the direct connection string) first." >&2
  exit 1
fi
command -v pg_dump >/dev/null || { echo "pg_dump not found — install PostgreSQL client tools (brew install postgresql@16)." >&2; exit 1; }

out="${1:-backups}"
keep="${BACKUP_KEEP:-14}"
mkdir -p "$out"
chmod 700 "$out"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
file="$out/brics-$stamp.dump"

# Custom format: compressed, and restorable table by table if it ever comes to that.
pg_dump --format=custom --compress=9 --no-owner --no-privileges --file="$file.partial" "$url"
mv "$file.partial" "$file"
chmod 600 "$file"

# The archive must at least be readable, or it is not a backup.
pg_restore --list "$file" >/dev/null
(cd "$out" && shasum -a 256 "$(basename "$file")" > "$(basename "$file").sha256")

echo "Backup: $file ($(du -h "$file" | cut -f1)), $(pg_restore --list "$file" | grep -c 'TABLE DATA') tables"

# Retention: newest $keep, oldest deleted.
ls -1t "$out"/brics-*.dump 2>/dev/null | tail -n +"$((keep + 1))" | while read -r old; do
  rm -f "$old" "$old.sha256"
  echo "Removed old backup $old"
done
