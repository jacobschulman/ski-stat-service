import 'dotenv/config';
import { TwitterPoster } from '../services/twitterPoster';
import { initDatabase } from '../db/schema';
import { DatabaseQueries } from '../db/queries';

async function main() {
  const poster = new TwitterPoster({
    apiKey: process.env.X_API_KEY!,
    apiKeySecret: process.env.X_API_KEY_SECRET!,
    accessToken: process.env.X_ACCESS_TOKEN!,
    accessTokenSecret: process.env.X_ACCESS_TOKEN_SECRET!,
  });

  // Step 1: Verify credentials
  console.log('🔑 Verifying X credentials...');
  try {
    const me = await poster.verifyCredentials();
    console.log(`✅ Connected as @${me.username} (ID: ${me.id})\n`);
  } catch (err: any) {
    console.error(`❌ Credential check failed: ${err.message}`);
    console.error('\nMake sure:');
    console.error('  1. App permissions are set to "Read and write"');
    console.error('  2. Access Token was regenerated AFTER changing permissions');
    console.error('  3. All 4 X_* env vars are set correctly in .env');
    process.exit(1);
  }

  // Step 2: Show approved posts ready to go
  const db = initDatabase(process.env.DATABASE_PATH || './data/ski-stats.db');
  const queries = new DatabaseQueries(db);
  const approved = queries.getPostsByStatus('approved');

  if (approved.length === 0) {
    console.log('No approved posts in the queue. Approve some in Slack first!');
    db.close();
    return;
  }

  console.log(`📋 ${approved.length} approved post(s) ready to post:\n`);
  approved.forEach((p, i) => {
    console.log(`  ${i + 1}. "${p.final_content.slice(0, 80)}..."`);
  });

  // Step 3: Post the first one if --post flag is passed
  if (process.argv.includes('--post')) {
    const post = approved[approved.length - 1]; // oldest first
    console.log(`\n🐦 Posting to X: "${post.final_content}"\n`);

    try {
      const result = await poster.postTweet(post.final_content);
      queries.updatePost({ id: post.id, status: 'posted' });
      queries.updatePostMetadata(post.id, {
        ...post.metadata,
        tweet_id: result.tweetId,
        tweet_url: result.url,
        posted_at: new Date().toISOString(),
      });
      console.log(`✅ Posted! ${result.url}`);
    } catch (err: any) {
      console.error(`❌ Post failed: ${err.message}`);
    }
  } else {
    console.log('\n💡 Run with --post to actually post the oldest approved tweet:');
    console.log('   npx ts-node src/scripts/testXPost.ts --post');
  }

  db.close();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
