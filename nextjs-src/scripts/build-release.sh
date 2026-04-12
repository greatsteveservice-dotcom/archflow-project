#!/usr/bin/env bash
# Build a deployable release directory from a freshly built Next.js standalone output.
#
# Pre-conditions:
#   - `npm run build` has been run with output: 'standalone' in next.config.js
#   - .next/standalone, .next/static, public/ all exist
#
# Output:
#   /tmp/archflow-release/ — ready to rsync to server
#
# Structure produced:
#   /tmp/archflow-release/
#     server.js            ← from .next/standalone/server.js
#     package.json         ← from .next/standalone/package.json
#     node_modules/        ← from .next/standalone/node_modules/
#     .next/               ← from .next/standalone/.next/ (server runtime)
#     .next/static/        ← COPIED from .next/static (client chunks)
#     public/              ← COPIED from public/ (favicon, sw.js, offline.html, icons)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
RELEASE_DIR="${RELEASE_DIR:-/tmp/archflow-release}"

cd "$PROJECT_DIR"

# Sanity checks
if [[ ! -d ".next/standalone" ]]; then
    echo "ERROR: .next/standalone not found. Run 'npm run build' first." >&2
    exit 1
fi
if [[ ! -d ".next/static" ]]; then
    echo "ERROR: .next/static not found." >&2
    exit 1
fi
if [[ ! -d "public" ]]; then
    echo "ERROR: public/ not found." >&2
    exit 1
fi

echo "→ Cleaning $RELEASE_DIR"
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR"

echo "→ Copying standalone server runtime"
cp -R .next/standalone/. "$RELEASE_DIR/"

echo "→ Copying client static chunks (.next/static → .next/static)"
mkdir -p "$RELEASE_DIR/.next/static"
cp -R .next/static/. "$RELEASE_DIR/.next/static/"

echo "→ Copying public/ assets"
mkdir -p "$RELEASE_DIR/public"
cp -R public/. "$RELEASE_DIR/public/"

# Quick sanity on output
if [[ ! -f "$RELEASE_DIR/server.js" ]]; then
    echo "ERROR: $RELEASE_DIR/server.js missing after copy" >&2
    exit 1
fi

SIZE=$(du -sh "$RELEASE_DIR" | cut -f1)
echo "✓ Release built at $RELEASE_DIR ($SIZE)"
echo ""
echo "Next: rsync to server"
echo "  RELEASE_ID=\$(date -u +%Y%m%d-%H%M%S)"
echo "  rsync -avz --delete $RELEASE_DIR/ archflow@<SERVER_IP>:/home/archflow/releases/\$RELEASE_ID/"
