#!/bin/bash
set -e

# ─── Archflow Deploy Script ──────────────────────────────────
# Builds locally, syncs to VPS, restarts via systemd.
# Usage: ./scripts/deploy.sh
# ──────────────────────────────────────────────────────────────

VPS_HOST="archflow@212.67.10.6"
SSH_KEY="$HOME/.ssh/archflow_ed25519"
SSH="ssh -i $SSH_KEY $VPS_HOST"
RSYNC="rsync -az -e 'ssh -i $SSH_KEY'"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE="$(date +%Y%m%d_%H%M%S)"

echo "═══ Archflow Deploy: $RELEASE ═══"

# 1. Build
echo "→ Building..."
cd "$PROJECT_DIR"
npm run build --silent 2>&1 | tail -3
echo "  ✓ Build complete"

# 2. Create release dir
$SSH "mkdir -p /home/archflow/releases/$RELEASE"

# 3. Sync files
echo "→ Syncing standalone..."
eval $RSYNC --delete "$PROJECT_DIR/.next/standalone/" "$VPS_HOST:/home/archflow/releases/$RELEASE/"
echo "→ Syncing static..."
eval $RSYNC "$PROJECT_DIR/.next/static" "$VPS_HOST:/home/archflow/releases/$RELEASE/.next/"
echo "→ Syncing public..."
eval $RSYNC "$PROJECT_DIR/public" "$VPS_HOST:/home/archflow/releases/$RELEASE/"
echo "  ✓ Files synced"

# 4. Deploy (symlink + restart + cleanup)
echo "→ Activating release..."
$SSH "/home/archflow/deploy.sh $RELEASE"

# 5. Health check
echo "→ Health check..."
sleep 2
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" https://archflow.ru/)
if [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "200" ]; then
  echo "  ✓ Site responding: HTTP $HTTP_CODE"
  echo ""
  echo "═══ Deploy successful: $RELEASE ═══"
else
  echo "  ✗ Site returned HTTP $HTTP_CODE — check manually!"
  exit 1
fi
