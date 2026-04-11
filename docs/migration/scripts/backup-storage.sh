#!/usr/bin/env bash
#
# ArchFlow — Weekly Supabase Storage sync (local)
# Uses rclone to mirror all Supabase buckets to local folder.
#
# Usage:
#   bash docs/migration/scripts/backup-storage.sh    # ручной запуск
#   launchd runs this weekly — см. launchd/com.archflow.backup-storage.plist
#
# Assumes rclone remote "supabase-storage" is configured.
# Setup: см. docs/migration/runbooks/20-storage-backup.md
#
set -euo pipefail

ENV_FILE="$HOME/.archflow-backup.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: $ENV_FILE not found" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"

: "${BACKUP_ROOT:?missing in env file}"
: "${STORAGE_RETENTION_DAYS:=90}"

RCLONE="$(command -v rclone || true)"
if [[ -z "$RCLONE" ]]; then
  echo "ERROR: rclone not found. brew install rclone" >&2
  exit 1
fi

REMOTE="supabase-storage"
if ! "$RCLONE" listremotes | grep -q "^${REMOTE}:$"; then
  echo "ERROR: rclone remote '$REMOTE' not configured." >&2
  echo "Run: docs/migration/runbooks/20-storage-backup.md step 2" >&2
  exit 1
fi

STORAGE_DIR="$BACKUP_ROOT/storage"
LOG_DIR="$BACKUP_ROOT/logs"
mkdir -p "$STORAGE_DIR" "$LOG_DIR"

TS="$(date +%Y%m%d-%H%M%S)"
LOG_FILE="$LOG_DIR/backup-storage-$TS.log"
SNAPSHOT_DIR="$STORAGE_DIR/snapshot-$TS"

{
  echo "========================================"
  echo "ArchFlow Storage backup — $(date -Iseconds)"
  echo "Target: $SNAPSHOT_DIR"
  echo "========================================"

  # List buckets first
  echo "[1/3] Discovering buckets..."
  BUCKETS=$("$RCLONE" lsd "${REMOTE}:" | awk '{print $NF}' || true)
  if [[ -z "$BUCKETS" ]]; then
    echo "WARN: no buckets listed. Check S3 credentials." >&2
  fi
  echo "    found: $(echo $BUCKETS | tr '\n' ' ')"

  # Full sync into snapshot folder (incremental — only changes transferred)
  echo "[2/3] rclone sync..."
  for BUCKET in $BUCKETS; do
    TARGET="$SNAPSHOT_DIR/$BUCKET"
    mkdir -p "$TARGET"
    "$RCLONE" sync "${REMOTE}:${BUCKET}" "$TARGET" \
      --fast-list \
      --transfers=8 \
      --checkers=16 \
      --retries=3 \
      --log-level INFO \
      --stats=30s || echo "    WARN: bucket $BUCKET failed"
  done

  # Also maintain "latest" symlink for easy access
  ln -sfn "$SNAPSHOT_DIR" "$STORAGE_DIR/latest"

  TOTAL_SIZE=$(du -sh "$SNAPSHOT_DIR" 2>/dev/null | cut -f1 || echo "?")
  echo "    snapshot size: $TOTAL_SIZE"

  echo "[3/3] Retention cleanup (>$STORAGE_RETENTION_DAYS days)..."
  find "$STORAGE_DIR" -maxdepth 1 -name 'snapshot-*' -type d -mtime "+$STORAGE_RETENTION_DAYS" -print -exec rm -rf {} \; || true
  find "$LOG_DIR" -name 'backup-storage-*.log' -type f -mtime "+$STORAGE_RETENTION_DAYS" -print -delete || true

  echo "DONE — $(date -Iseconds)"
} 2>&1 | tee "$LOG_FILE"

echo "$(date -Iseconds) OK $SNAPSHOT_DIR" > "$BACKUP_ROOT/last-storage-backup.txt"
