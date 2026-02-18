# Deploy & Operations Guide

## Quick Deploy (from your laptop)

```bash
npm run deploy
```

This does two things:
1. Pushes your local `main` branch to GitHub
2. SSHs into the Unraid server, pulls the code, and rebuilds the Docker container

**Important:** You must commit your changes first. The deploy script starts with `git push`.

## Prerequisites

- SSH access to the Unraid server (`root@jasnas`)
- The repo cloned on Unraid at `/mnt/user/appdata/ski-stat-service`
- Docker + Docker Compose installed on Unraid
- A `.env` file on the Unraid server with all required keys (see `.env.example`)

## What Happens During Deploy

1. `git push origin main` — pushes your committed changes to GitHub
2. SSHs into `root@jasnas` and runs `scripts/update.sh`, which:
   - `git pull origin main` — pulls latest code on the server
   - `docker compose down` — stops the running container
   - `docker compose build --no-cache` — rebuilds the image
   - `docker compose up -d` — starts the new container
   - Shows the last 10 log lines to confirm startup

## Pulling Code & Restarting on Unraid

If you need to manually update the server (e.g., you already pushed to GitHub):

```bash
# From your laptop
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && ./scripts/update.sh"
```

Or if you're already SSH'd into the Unraid server:

```bash
cd /mnt/user/appdata/ski-stat-service
./scripts/update.sh
```

To just restart without rebuilding:

```bash
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose restart"
```

## Force a Generation Run

The daily generation runs at 8 AM ET via cron inside the container. If you need to trigger it manually:

**Option 1: Dashboard button**
- Go to the dashboard (http://jasnas:3000)
- Click the "Generate Now" button in the header
- Check Slack in ~30 seconds for posts to review

**Option 2: API call**
```bash
curl -X POST http://jasnas:3000/api/generate
```

**Option 3: From your laptop (if not on local network)**
```bash
ssh root@jasnas "curl -s -X POST http://localhost:3000/api/generate"
```

## Checking Status & Logs

```bash
# Is the container running?
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose ps"

# Recent logs
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose logs --tail=50"

# Follow logs live
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose logs -f"

# Check if generation ran today (look for "Starting daily generation")
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose logs --since 24h | grep -i generat"
```

## Environment Overrides

If your Unraid setup changes, override via env vars:

```bash
UNRAID_HOST=192.168.1.50 npm run deploy
UNRAID_APP_DIR=/some/other/path npm run deploy
```

Defaults:
- `UNRAID_HOST` = `jasnas`
- `UNRAID_USER` = `root`
- `UNRAID_APP_DIR` = `/mnt/user/appdata/ski-stat-service`

## Docker Volumes

The `docker-compose.yml` mounts two directories from the host:

| Host Path | Container Path | Purpose |
|-----------|---------------|---------|
| `./data` | `/app/data` | SQLite database (persists across rebuilds) |
| `./prompts` | `/app/prompts` | System prompt file (editable from dashboard, git-trackable) |

## Key Config (docker-compose.yml)

- `TZ=America/New_York` — all cron jobs run in Eastern time
- `SCHEDULER_ENABLED=true` — enables the 8 AM daily generation cron
- `DATABASE_PATH=/app/data/ski-stats.db` — DB persists via volume mount

## Troubleshooting

**"Could not resolve hostname"** — Your laptop can't reach the Unraid server. Try `ping jasnas`. If it doesn't resolve, use the IP address: `UNRAID_HOST=<ip> npm run deploy`.

**"Everything up-to-date"** — You haven't committed your changes yet. Run `git add` + `git commit` first.

**No Slack ping in the morning** — Check: (1) Is the container running? (2) Check logs for errors. (3) The timezone might be wrong — the container must have `TZ=America/New_York` set in docker-compose.yml. Without it, 8 AM means 8 AM UTC (3 AM Eastern).

**Container won't start** — SSH in and check logs:
```bash
ssh root@jasnas "cd /mnt/user/appdata/ski-stat-service && docker compose logs --tail=50"
```

**Generation failed** — Usually means no ski data for today yet (the scraper hasn't run), or an API key issue. Check the logs for the specific error.
