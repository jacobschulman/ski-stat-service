import 'dotenv/config';
import { initDatabase } from '../db/schema';
import { DatabaseQueries } from '../db/queries';
import { Analyzer } from '../services/analyzer';
import { buildGenerationPrompt } from '../services/masterPromptBuilder';
import { ClaudeGenerator } from '../services/claudeGenerator';
import { SlackBot } from '../services/slackBot';

async function main() {
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];
  const slackOnly = process.argv.includes('--slack-only'); // re-post existing posts to Slack

  console.log('═══════════════════════════════════════════════');
  console.log('  Ski Stats - Generate & Post to Slack');
  console.log(`  Date: ${targetDate}`);
  console.log('═══════════════════════════════════════════════\n');

  // Init DB
  const db = initDatabase(process.env.DATABASE_PATH || './data/ski-stats.db');
  const queries = new DatabaseQueries(db);

  // Check required env vars
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const slackBotToken = process.env.SLACK_BOT_TOKEN;
  const slackAppToken = process.env.SLACK_APP_TOKEN;
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;
  const channelId = process.env.SLACK_CHANNEL_ID;

  if (!slackBotToken || !slackAppToken || !slackSigningSecret) {
    console.error('❌ Missing Slack config. Set SLACK_BOT_TOKEN, SLACK_APP_TOKEN, SLACK_SIGNING_SECRET in .env');
    console.error('\nSee setup instructions: docs/SLACK_SETUP.md');
    process.exit(1);
  }

  if (!channelId) {
    console.error('❌ Set SLACK_CHANNEL_ID in .env (the channel to post to)');
    process.exit(1);
  }

  let posts;

  if (slackOnly) {
    // Just re-post existing pending posts to Slack
    posts = queries.getPostsByDate(targetDate).filter(p => p.status === 'pending');
    if (posts.length === 0) {
      console.log('No pending posts found for this date. Run without --slack-only to generate new ones.');
      process.exit(0);
    }
    console.log(`Found ${posts.length} existing pending posts for ${targetDate}`);
  } else {
    // Generate new posts
    if (!apiKey || apiKey === 'your-key-here') {
      console.error('❌ Set ANTHROPIC_API_KEY in .env');
      process.exit(1);
    }

    const analyzer = new Analyzer(queries);

    console.log('📊 Analyzing data...');
    const analysis = await analyzer.analyzeDate(targetDate);
    const formattedAnalysis = analyzer.formatForPrompt(analysis);

    const postCount = parseInt(process.env.POST_COUNT || '12', 10);
    const { system, user } = buildGenerationPrompt(formattedAnalysis, postCount);

    console.log(`🤖 Generating ${postCount} posts with Claude...`);
    const generator = new ClaudeGenerator(apiKey);
    posts = await generator.generatePosts(system, user, targetDate);

    // Save to database
    for (const post of posts) {
      queries.insertPost(post);
    }
    console.log(`💾 ${posts.length} posts saved to database`);
  }

  // Start Slack bot and post for review
  console.log('\n📱 Connecting to Slack...');
  const slackBot = new SlackBot(queries, {
    botToken: slackBotToken,
    appToken: slackAppToken,
    signingSecret: slackSigningSecret,
  });

  await slackBot.start();

  console.log(`📤 Posting ${posts.length} posts to Slack channel for review...`);
  await slackBot.postForReview(posts);

  console.log('\n✅ Done! Check your Slack channel to approve, edit, or reject posts.');
  console.log('   The bot will stay running to handle your button clicks.\n');
  console.log('   Press Ctrl+C to stop.\n');

  // Keep running to handle Slack interactions
  process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    await slackBot.stop();
    db.close();
    process.exit(0);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
