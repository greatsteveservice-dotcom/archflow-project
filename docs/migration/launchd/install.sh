#!/usr/bin/env bash
#
# Install ArchFlow launchd agents (daily DB backup + weekly storage sync).
#
set -euo pipefail

SRC_DIR="$(cd "$(dirname "$0")" && pwd)"
DEST_DIR="$HOME/Library/LaunchAgents"
mkdir -p "$DEST_DIR"

AGENTS=(
  "com.archflow.backup-db.plist"
  "com.archflow.backup-storage.plist"
)

for plist in "${AGENTS[@]}"; do
  SRC="$SRC_DIR/$plist"
  DEST="$DEST_DIR/$plist"

  if [[ ! -f "$SRC" ]]; then
    echo "ERROR: $SRC not found" >&2
    exit 1
  fi

  # Unload if already loaded
  if launchctl list | grep -q "${plist%.plist}"; then
    echo "Unloading existing: $plist"
    launchctl unload "$DEST" 2>/dev/null || true
  fi

  echo "Installing: $plist"
  cp "$SRC" "$DEST"
  launchctl load "$DEST"
done

echo
echo "Installed agents:"
launchctl list | grep archflow || echo "  (none listed — check errors above)"

echo
echo "Verify schedule:"
echo "  launchctl list com.archflow.backup-db"
echo "  launchctl list com.archflow.backup-storage"
echo
echo "Manual trigger for testing:"
echo "  launchctl start com.archflow.backup-db"
echo "  launchctl start com.archflow.backup-storage"
