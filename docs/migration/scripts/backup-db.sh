#!/usr/bin/env bash
#
# ArchFlow — Daily Supabase Postgres backup (local)
# Creates compressed, GPG-encrypted pg_dump of the full Supabase database.
#
# Usage:
#   bash docs/migration/scripts/backup-db.sh         # одноразовый запуск
#   launchd runs this daily — см. launchd/com.archflow.backup-db.plist
#
# Env file: ~/.archflow-backup.env (chmod 600)
#
set -euo pipefail

# ---------- Load env ----------
ENV_FILE="$HOME/.archflow-backup.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found. See docs/migration/runbooks/00-sprint0-setup.md" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${SUPABASE_DB_HOST:?missing in env file}"
: "${SUPABASE_DB_PORT:=5432}"
: "${SUPABASE_DB_NAME:=postgres}"
: "${SUPABASE_DB_USER:?missing in env file}"
: "${SUPABASE_DB_PASSWORD:?missing in env file}"
: "${BACKUP_ROOT:?missing in env file}"
: "${GPG_RECIPIENT:?missing in env file}"
: "${DB_RETENTION_DAYS:=30}"

# ---------- Paths & tools ----------
PG_DUMP="/opt/homebrew/opt/libpq/bin/pg_dump"
[[ -x "$PG_DUMP" ]] || PG_DUMP="$(command -v pg_dump || true)"
if [[ -z "$PG_DUMP" ]]; then
  echo "ERROR: pg_dump not found. brew install libpq" >&2
  exit 1
fi

GPG="$(command -v gpg || true)"
if [[ -z "$GPG" ]]; then
  echo "ERROR: gpg not found. brew install gnupg" >&2
  exit 1
fi

DB_DIR="$BACKUP_ROOT/db"
LOG_DIR="$BACKUP_ROOT/logs"
mkdir -p "$DB_DIR" "$LOG_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
DUMP_FILE="$DB_DIR/archflow-db-$TS.dump"
ENC_FILE="$DUMP_FILE.gpg"
LOG_FILE="$LOG_DIR/backup-db-$TS.log"

# ---------- Run ----------
{
  echo "========================================"
  echo "ArchFlow DB backup — $(date -Iseconds)"
  echo "Target: $ENC_FILE"
  echo "========================================"

  export PGPASSWORD="$SUPABASE_DB_PASSWORD"

  echo "[1/3] pg_dump (custom format, compressed)..."
  "$PG_DUMP" \
    --host="$SUPABASE_DB_HOST" \
    --port="$SUPABASE_DB_PORT" \
    --username="$SUPABASE_DB_USER" \
    --dbname="$SUPABASE_DB_NAME" \
    --no-owner --no-privileges \
    --format=custom \
    --compress=9 \
    --file="$DUMP_FILE"

  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  echo "    dump size: $DUMP_SIZE"

  echo "[2/3] GPG encrypt for $GPG_RECIPIENT..."
  "$GPG" --batch --yes --trust-model always \
    --recipient "$GPG_RECIPIENT" \
    --encrypt --output "$ENC_FILE" "$DUMP_FILE"

  rm -f "$DUMP_FILE"
  ENC_SIZE=$(du -h "$ENC_FILE" | cut -f1)
  echo "    encrypted: $ENC_SIZE"

  echo "[3/3] Retention cleanup (>$DB_RETENTION_DAYS days)..."
  find "$DB_DIR" -name 'archflow-db-*.dump.gpg' -type f -mtime "+$DB_RETENTION_DAYS" -print -delete || true
  find "$LOG_DIR" -name 'backup-db-*.log' -type f -mtime "+$DB_RETENTION_DAYS" -print -delete || true

  echo "DONE — $(date -Iseconds)"
} 2>&1 | tee "$LOG_FILE"

# ---------- Health file (for monitoring) ----------
echo "$(date -Iseconds) OK $ENC_FILE" > "$BACKUP_ROOT/last-db-backup.txt"
