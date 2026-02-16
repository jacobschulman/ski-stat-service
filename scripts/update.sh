#!/bin/bash
# update.sh — Run this ON the Unraid server to pull latest code and rebuild
# Usage: ./scripts/update.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "🔄 Pulling latest code..."
git pull origin main

echo "🔨 Rebuilding container..."
docker compose down
docker compose build --no-cache
docker compose up -d

echo ""
echo "✅ Updated and running!"
echo ""
docker compose logs --tail=10
