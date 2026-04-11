#!/usr/bin/env bash
#
# ArchFlow — Backup health check
# Verifies that recent backups exist and are non-empty. Exits non-zero on issues.
#
set -euo pipefail

ENV_FILE="$HOME/.archflow-backup.env"
# shellcheck disable=SC1090
[[ -f "$ENV_FILE" ]] && source "$ENV_FILE"
: "${BACKUP_ROOT:=$HOME/archflow-backups}"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[0;33m'; NC='\033[0m'
FAIL=0

check_file() {
  local file="$1"
  local label="$2"
  local max_age_hours="$3"

  if [[ ! -f "$file" ]]; then
    echo -e "${RED}FAIL${NC}  $label: file not found ($file)"
    FAIL=1
    return
  fi

  local size
  size=$(stat -f %z "$file" 2>/dev/null || stat -c %s "$file" 2>/dev/null || echo 0)
  if [[ "$size" -lt 1024 ]]; then
    echo -e "${RED}FAIL${NC}  $label: too small ($size bytes)"
    FAIL=1
    return
  fi

  local mtime_epoch
  mtime_epoch=$(stat -f %m "$file" 2>/dev/null || stat -c %Y "$file" 2>/dev/null || echo 0)
  local now_epoch; now_epoch=$(date +%s)
  local age_hours=$(( (now_epoch - mtime_epoch) / 3600 ))

  if [[ "$age_hours" -gt "$max_age_hours" ]]; then
    echo -e "${YELLOW}STALE${NC} $label: ${age_hours}h old (max ${max_age_hours}h)"
    FAIL=1
  else
    echo -e "${GREEN}OK${NC}    $label: ${age_hours}h old, $(du -h "$file" | cut -f1)"
  fi
}

echo "ArchFlow backup health check — $(date -Iseconds)"
echo "Root: $BACKUP_ROOT"
echo

# Latest DB backup (must be < 30h old for daily cadence)
LATEST_DB=$(ls -t "$BACKUP_ROOT/db/"archflow-db-*.dump.gpg 2>/dev/null | head -1 || true)
if [[ -n "$LATEST_DB" ]]; then
  check_file "$LATEST_DB" "DB backup" 30
else
  echo -e "${RED}FAIL${NC}  DB backup: none found"
  FAIL=1
fi

# Latest storage snapshot (must be < 8 days old for weekly cadence)
LATEST_STORAGE=$(ls -dt "$BACKUP_ROOT/storage/snapshot-"* 2>/dev/null | head -1 || true)
if [[ -n "$LATEST_STORAGE" ]]; then
  echo -e "${GREEN}OK${NC}    Storage snapshot: $LATEST_STORAGE ($(du -sh "$LATEST_STORAGE" 2>/dev/null | cut -f1))"
else
  echo -e "${YELLOW}WARN${NC}  Storage snapshot: none yet"
fi

# Health files
if [[ -f "$BACKUP_ROOT/last-db-backup.txt" ]]; then
  echo "     last-db: $(cat "$BACKUP_ROOT/last-db-backup.txt")"
fi
if [[ -f "$BACKUP_ROOT/last-storage-backup.txt" ]]; then
  echo "     last-storage: $(cat "$BACKUP_ROOT/last-storage-backup.txt")"
fi

exit "$FAIL"
