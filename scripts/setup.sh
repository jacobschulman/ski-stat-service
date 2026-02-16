#!/bin/bash
# setup.sh — First-time setup on Unraid server
# Usage: ssh into Unraid, then:
#   git clone https://github.com/jacobschulman/ski-stat-service.git /mnt/user/appdata/ski-stat-service
#   cd /mnt/user/appdata/ski-stat-service
#   ./scripts/setup.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

cd "$APP_DIR"

echo "═══════════════════════════════════════════════"
echo "  Ski Stats Service - First Time Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Check for .env
if [ ! -f .env ]; then
  echo "📝 No .env file found. Creating from template..."
  cp .env.example .env
  echo ""
  echo "⚠️  IMPORTANT: Edit .env with your actual API keys before starting!"
  echo "   nano .env"
  echo ""
  echo "   Required keys:"
  echo "   - ANTHROPIC_API_KEY"
  echo "   - SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_ID"
  echo "   - X_API_KEY, X_API_KEY_SECRET, X_ACCESS_TOKEN, X_ACCESS_TOKEN_SECRET"
  echo ""
  echo "   After editing .env, run this script again."
  exit 0
fi

# Create data directory
mkdir -p data

echo "🔨 Building Docker container..."
docker compose build

echo ""
echo "🚀 Starting service..."
docker compose up -d

echo ""
echo "✅ Setup complete! Service is running."
echo ""
echo "📋 Useful commands:"
echo "   docker compose logs -f          # Watch live logs"
echo "   docker compose restart          # Restart service"
echo "   docker compose down             # Stop service"
echo "   ./scripts/update.sh             # Pull latest + rebuild"
echo ""
docker compose logs --tail=15
