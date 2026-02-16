import 'dotenv/config';
import cron from 'node-cron';
import { initDatabase } from './db/schema';
import { DatabaseQueries } from './db/queries';
import { Analyzer } from './services/analyzer';
import { buildGenerationPrompt } from './services/masterPromptBuilder';
import { ClaudeGenerator } from './services/claudeGenerator';
import { SlackBot } from './services/slackBot';
import { TwitterPoster } from './services/twitterPoster';
import { PostScheduler } from './services/postScheduler';

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Ski Stats Service');
  console.log('  Always-on: Generate → Slack → X');
  console.log('═══════════════════════════════════════════════\n');

  // Init DB
  const dbPath = process.env.DATABASE_PATH || './data/ski-stats.db';
  const db = initDatabase(dbPath);
  const queries = new DatabaseQueries(db);

  // Validate required config
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-key-here') {
    console.error('❌ Set ANTHROPIC_API_KEY in .env');
    process.exit(1);
  }

  const slackBotToken = process.env.SLACK_BOT_TOKEN;
  const slackAppToken = process.env.SLACK_APP_TOKEN;
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!slackBotToken || !slackAppToken || !slackSigningSecret || !channelId) {
    console.error('❌ Missing Slack config. Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET, SLACK_CHANNEL_ID in .env');
    process.exit(1);
  }

  // Start Slack bot (stays connected for approve/edit/reject buttons)
  const slackBot = new SlackBot(queries, {
    botToken: slackBotToken,
    appToken: slackAppToken,
    signingSecret: slackSigningSecret,
  });
  await slackBot.start();

  // Set up X poster + scheduler (optional — runs without X config too)
  let scheduler: PostScheduler | null = null;
  const xApiKey = process.env.X_API_KEY;
  const xApiKeySecret = process.env.X_API_KEY_SECRET;
  const xAccessToken = process.env.X_ACCESS_TOKEN;
  const xAccessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (xApiKey && xApiKeySecret && xAccessToken && xAccessTokenSecret) {
    const poster = new TwitterPoster({
      apiKey: xApiKey,
      apiKeySecret: xApiKeySecret,
      accessToken: xAccessToken,
      accessTokenSecret: xAccessTokenSecret,
    });

    // Verify X credentials
    try {
      const me = await poster.verifyCredentials();
      console.log(`🐦 X account connected: @${me.username}`);
    } catch (err: any) {
      console.error(`⚠️  X credentials failed: ${err.message}`);
      console.error('   Posts will not auto-post to X. Fix your X_* env vars.');
    }

    const intervalHours = parseFloat(process.env.X_POST_INTERVAL_HOURS || '1.5');
    const startHour = parseInt(process.env.X_POST_START_HOUR || '9', 10);
    const endHour = parseInt(process.env.X_POST_END_HOUR || '21', 10);

    scheduler = new PostScheduler(queries, poster, { intervalHours, startHour, endHour });
    scheduler.start();
  } else {
    console.log('ℹ️  X posting disabled (no X_API_KEY set). Slack-only mode.');
  }

  // Schedule daily content generation
  const generationTime = process.env.GENERATION_TIME || '08:00';
  const [genHour, genMinute] = generationTime.split(':');
  const schedulerEnabled = process.env.SCHEDULER_ENABLED !== 'false';

  if (schedulerEnabled) {
    const cronExpr = `${genMinute} ${genHour} * * *`;
    console.log(`⏰ Daily generation scheduled at ${generationTime} (cron: ${cronExpr})`);

    cron.schedule(cronExpr, async () => {
      await generateAndPost(queries, apiKey, slackBot);
    });
  } else {
    console.log('ℹ️  Scheduler disabled. Run manually with: npm run generate-slack');
  }

  console.log('\n✅ Service running. Press Ctrl+C to stop.\n');

  // Graceful shutdown
  const shutdown = async () => {
    console.log('\nShutting down...');
    scheduler?.stop();
    await slackBot.stop();
    db.close();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function generateAndPost(
  queries: DatabaseQueries,
  apiKey: string,
  slackBot: SlackBot,
) {
  const targetDate = new Date().toISOString().split('T')[0];
  console.log(`\n🎿 Starting daily generation for ${targetDate}...`);

  try {
    const analyzer = new Analyzer(queries);

    console.log('📊 Analyzing data...');
    const analysis = await analyzer.analyzeDate(targetDate);
    const formattedAnalysis = analyzer.formatForPrompt(analysis);

    const postCount = parseInt(process.env.POST_COUNT || '12', 10);
    const { system, user } = buildGenerationPrompt(formattedAnalysis, postCount);

    console.log(`🤖 Generating ${postCount} posts with Claude...`);
    const generator = new ClaudeGenerator(apiKey);
    const posts = await generator.generatePosts(system, user, targetDate);

    // Save to database
    for (const post of posts) {
      queries.insertPost(post);
    }
    console.log(`💾 ${posts.length} posts saved to database`);

    // Post to Slack for review
    const channelId = process.env.SLACK_CHANNEL_ID!;
    console.log(`📤 Posting ${posts.length} posts to Slack for review...`);
    await slackBot.postForReview(posts);
    console.log('✅ Posts sent to Slack!');
  } catch (err: any) {
    console.error(`❌ Generation failed: ${err.message}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
