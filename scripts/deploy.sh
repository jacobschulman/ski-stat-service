#!/bin/bash
# deploy.sh — Push code + rebuild on Unraid, all from your laptop
#
# First time? Set your Unraid SSH details:
#   export UNRAID_HOST=192.168.1.xxx   (or hostname)
#   export UNRAID_USER=root            (default for Unraid)
#   export UNRAID_APP_DIR=/mnt/user/appdata/ski-stat-service
#
# Or just edit the defaults below.

set -e

UNRAID_HOST="${UNRAID_HOST:-tower}"
UNRAID_USER="${UNRAID_USER:-root}"
UNRAID_APP_DIR="${UNRAID_APP_DIR:-/mnt/user/appdata/ski-stat-service}"

echo "═══════════════════════════════════════════════"
echo "  Deploying to Unraid"
echo "  Host: ${UNRAID_USER}@${UNRAID_HOST}"
echo "  Path: ${UNRAID_APP_DIR}"
echo "═══════════════════════════════════════════════"
echo ""

# Step 1: Push local changes to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

# Step 2: SSH to Unraid and update
echo "🔄 Updating on Unraid..."
ssh "${UNRAID_USER}@${UNRAID_HOST}" "cd ${UNRAID_APP_DIR} && ./scripts/update.sh"

echo ""
echo "✅ Deployed!"
