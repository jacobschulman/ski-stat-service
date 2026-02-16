# Slack App Setup Guide

This takes about 5 minutes. You'll create a Slack App with Socket Mode (no public URL needed — perfect for running on your Unraid server or locally).

## Step 1: Create the Slack App

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name it: `Ski Stats Bot`
4. Pick your workspace
5. Click **Create App**

## Step 2: Enable Socket Mode

1. In the left sidebar, click **Socket Mode**
2. Toggle **Enable Socket Mode** ON
3. It will ask you to create an App-Level Token:
   - Name: `ski-stats-socket`
   - Scope: `connections:write`
   - Click **Generate**
4. **Copy the token** (starts with `xapp-...`) → This is your `SLACK_APP_TOKEN`

## Step 3: Set Bot Permissions

1. In the left sidebar, click **OAuth & Permissions**
2. Scroll to **Scopes** → **Bot Token Scopes**
3. Add these scopes:
   - `chat:write` — Post messages
   - `chat:write.public` — Post to channels the bot isn't in
   - `channels:read` — Find channels

## Step 4: Enable Interactivity

1. In the left sidebar, click **Interactivity & Shortcuts**
2. Toggle **Interactivity** ON
3. (No Request URL needed — Socket Mode handles this)
4. Click **Save Changes**

## Step 5: Install to Workspace

1. In the left sidebar, click **Install App**
2. Click **Install to Workspace**
3. Click **Allow**
4. **Copy the Bot User OAuth Token** (starts with `xoxb-...`) → This is your `SLACK_BOT_TOKEN`

## Step 6: Get Your Signing Secret

1. In the left sidebar, click **Basic Information**
2. Under **App Credentials**, find **Signing Secret**
3. Click **Show** and copy it → This is your `SLACK_SIGNING_SECRET`

## Step 7: Create a Slack Channel

1. In Slack, create a new channel: `#ski-stats-posts`
2. Right-click the channel name → **View channel details**
3. Scroll to the bottom to find the **Channel ID** (starts with `C...`)
4. Copy it → This is your `SLACK_CHANNEL_ID`
5. Invite the bot: type `/invite @Ski Stats Bot` in the channel

## Step 8: Update .env

Add these to your `.env` file:

```env
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CHANNEL_ID=C0123456789
```

## Step 9: Run It

```bash
# Generate posts and send to Slack
npm run generate-slack

# Or re-post existing pending posts
npm run generate-slack -- --slack-only
```

## What You'll See in Slack

Each generated post appears as a message with three buttons:

- **Approve** (green) — Marks the post as approved and ready to publish
- **Edit** — Opens a modal where you can edit the text, then saves & approves
- **Reject** (red) — Marks the post as rejected

After you click a button, the message updates to show the action taken.

## Troubleshooting

**"Missing Slack config" error:**
- Make sure all 4 Slack env vars are set in `.env`

**Bot doesn't respond to button clicks:**
- Make sure Socket Mode is enabled
- Make sure Interactivity is enabled
- Make sure the bot is invited to the channel

**"channel_not_found" error:**
- Use the Channel ID (starts with `C`), not the channel name
- Make sure the bot is invited to the channel

## Free Tier Limits

All of this works on Slack's free plan:
- Socket Mode: unlimited
- Bot messages: unlimited
- Interactive components: unlimited
- The only free tier limit is message history (90 days) — not relevant for us
