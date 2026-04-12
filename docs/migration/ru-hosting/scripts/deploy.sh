#!/usr/bin/env bash
# One-command deploy of Archflow Next.js standalone build to a Russian VPS.
#
# Usage:
#   bash docs/migration/ru-hosting/scripts/deploy.sh <SERVER_IP>
#
# Optional env:
#   SSH_USER     — default: archflow
#   SSH_PORT     — default: 22
#   HEALTH_URL   — default: https://archflow.ru
#   KEEP_RELEASES — default: 5
#
# This script is atomic — new release is built in a new directory,
# symlink is switched, systemd restarts. Rollback is automatic
# if the health check fails after restart.

set -euo pipefail

SERVER_IP="${1:-}"
SSH_USER="${SSH_USER:-archflow}"
SSH_PORT="${SSH_PORT:-22}"
HEALTH_URL="${HEALTH_URL:-https://archflow.ru}"
KEEP_RELEASES="${KEEP_RELEASES:-5}"

if [[ -z "$SERVER_IP" ]]; then
    echo "Usage: $0 <SERVER_IP>" >&2
    exit 1
fi

SSH="ssh -p $SSH_PORT -o StrictHostKeyChecking=accept-new $SSH_USER@$SERVER_IP"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/../../../.." && pwd)"
NEXTJS_DIR="$PROJECT_DIR/nextjs-src"
RELEASE_ID=$(date -u +%Y%m%d-%H%M%S)

cd "$NEXTJS_DIR"

echo "=========================================="
echo "Archflow deploy to $SSH_USER@$SERVER_IP"
echo "Release ID: $RELEASE_ID"
echo "=========================================="

# 1. Build locally
echo ""
echo "[1/8] Installing deps (if needed)"
if [[ package-lock.json -nt node_modules/.package-lock.json || ! -d node_modules ]]; then
    npm ci
else
    echo "    Skipped (deps up-to-date)"
fi

echo ""
echo "[2/8] Building Next.js standalone"
npm run build

echo ""
echo "[3/8] Assembling release directory"
bash scripts/build-release.sh

# 2. Upload to server
echo ""
echo "[4/8] Uploading release to /home/archflow/releases/$RELEASE_ID/"
$SSH "mkdir -p /home/archflow/releases/$RELEASE_ID"
rsync -az --delete -e "ssh -p $SSH_PORT" \
    /tmp/archflow-release/ \
    "$SSH_USER@$SERVER_IP:/home/archflow/releases/$RELEASE_ID/"

# 3. Copy .env.production from current release
echo ""
echo "[5/8] Copying .env.production from current release"
$SSH "if [[ -f /home/archflow/app/.env.production ]]; then cp /home/archflow/app/.env.production /home/archflow/releases/$RELEASE_ID/.env.production; chmod 600 /home/archflow/releases/$RELEASE_ID/.env.production; else echo 'WARNING: no existing .env.production to copy'; fi"

# 4. Switch symlink atomically, remember previous for rollback
echo ""
echo "[6/8] Switching symlink → releases/$RELEASE_ID"
PREVIOUS_RELEASE=$($SSH "readlink /home/archflow/app || echo ''")
echo "    Previous: $PREVIOUS_RELEASE"
$SSH "ln -sfn /home/archflow/releases/$RELEASE_ID /home/archflow/app"

# 5. Restart systemd
echo ""
echo "[7/8] Restarting archflow.service"
$SSH "sudo systemctl restart archflow"
sleep 3

# 6. Health check
echo ""
echo "[8/8] Health check: $HEALTH_URL"
HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}" "$HEALTH_URL" || echo "000")
echo "    HTTP $HTTP_STATUS"

if [[ "$HTTP_STATUS" != "200" && "$HTTP_STATUS" != "307" && "$HTTP_STATUS" != "308" ]]; then
    echo ""
    echo "  ✗ HEALTH CHECK FAILED — rolling back"
    if [[ -n "$PREVIOUS_RELEASE" ]]; then
        $SSH "ln -sfn $PREVIOUS_RELEASE /home/archflow/app && sudo systemctl restart archflow"
        echo "  ↻ Rolled back to $PREVIOUS_RELEASE"
    else
        echo "  ⚠ No previous release to roll back to"
    fi
    exit 1
fi

# 7. Cleanup old releases
echo ""
echo "Cleaning old releases (keeping last $KEEP_RELEASES)"
$SSH "cd /home/archflow/releases && ls -1t | tail -n +$((KEEP_RELEASES+1)) | xargs -r rm -rf"

echo ""
echo "=========================================="
echo "✓ Deploy complete: $RELEASE_ID"
echo "=========================================="
