#!/usr/bin/env bash
#
# Uninstall ArchFlow launchd agents.
#
set -euo pipefail

DEST_DIR="$HOME/Library/LaunchAgents"
AGENTS=(
  "com.archflow.backup-db.plist"
  "com.archflow.backup-storage.plist"
)

for plist in "${AGENTS[@]}"; do
  DEST="$DEST_DIR/$plist"
  if [[ -f "$DEST" ]]; then
    echo "Unloading & removing: $plist"
    launchctl unload "$DEST" 2>/dev/null || true
    rm -f "$DEST"
  else
    echo "Not installed: $plist"
  fi
done

echo "Done."
