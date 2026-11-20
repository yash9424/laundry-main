#!/usr/bin/env bash
#
# Nightly dump of the laundry database.
#
# Keeps one gzipped archive per night under ~/backups, throws away anything
# older than the retention window, and writes a line to a log either way so a
# run that fails is visible rather than silent.
#
# Installed as a cron entry; see the block at the foot of this file for the
# line that schedules it.
#
# A dump sitting on the same disk as the database is not a backup -- it
# survives a bad migration, not a dead server -- so the copy off the machine
# matters. That step is deliberately left to the operator, since where it goes
# depends on which storage account the business wants it in.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
LOG="${BACKUP_LOG:-$HOME/backups/backup.log}"
KEEP_DAYS="${KEEP_DAYS:-14}"
ENV_FILE="${ENV_FILE:-/var/www/laundry-admin/admin panel/.env.production}"

mkdir -p "$BACKUP_DIR"

say() { printf '%s  %s\n' "$(date -u '+%Y-%m-%d %H:%M:%SZ')" "$1" >> "$LOG"; }

# The URI lives in the app's own env file, so the backup can never drift onto a
# different database from the one being served.
if [ -r "$ENV_FILE" ]; then
  URI="$(grep -E '^MONGODB_URI=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
else
  URI="${MONGODB_URI:-}"
fi

if [ -z "${URI:-}" ]; then
  say "FAILED: no MONGODB_URI (looked in $ENV_FILE)"
  exit 1
fi

STAMP="$(date -u '+%Y%m%d-%H%M%S')"
OUT="$BACKUP_DIR/laundry-$STAMP.archive.gz"

if mongodump --uri="$URI" --archive="$OUT" --gzip --quiet 2>>"$LOG"; then
  SIZE="$(du -h "$OUT" | cut -f1)"
  # A dump that writes almost nothing is a failure wearing a success exit code.
  BYTES="$(stat -c%s "$OUT")"
  if [ "$BYTES" -lt 10000 ]; then
    say "FAILED: $OUT is only $BYTES bytes, treating as a bad dump"
    exit 1
  fi
  say "ok: $OUT ($SIZE)"
else
  say "FAILED: mongodump returned non-zero"
  rm -f "$OUT"
  exit 1
fi

# Retention. -mtime +N deletes strictly older than N days.
DELETED="$(find "$BACKUP_DIR" -name 'laundry-*.archive.gz' -mtime "+$KEEP_DAYS" -print -delete | wc -l)"
[ "$DELETED" -gt 0 ] && say "pruned $DELETED archive(s) older than $KEEP_DAYS days"

say "kept: $(find "$BACKUP_DIR" -name 'laundry-*.archive.gz' | wc -l) archive(s)"

# Install with:
#   chmod +x "/var/www/laundry-admin/admin panel/scripts/backup-mongo.sh"
#   ( crontab -l 2>/dev/null; echo '15 2 * * * "/var/www/laundry-admin/admin panel/scripts/backup-mongo.sh"' ) | crontab -
#
# Restore a night with:
#   mongorestore --uri="$MONGODB_URI" --archive=/path/laundry-YYYYMMDD-HHMMSS.archive.gz --gzip --drop
