import 'dotenv/config';
import { initDatabase } from '../db/schema';
import { DatabaseQueries } from '../db/queries';
import { Analyzer } from '../services/analyzer';
import { buildGenerationPrompt } from '../services/masterPromptBuilder';
import { ClaudeGenerator } from '../services/claudeGenerator';

async function main() {
  const targetDate = process.argv[2] || new Date().toISOString().split('T')[0];

  console.log('═══════════════════════════════════════════════');
  console.log('  Ski Stats Post Generator - Test Run');
  console.log(`  Target date: ${targetDate}`);
  console.log('═══════════════════════════════════════════════\n');

  // Init
  const db = initDatabase(process.env.DATABASE_PATH || './data/ski-stats.db');
  const queries = new DatabaseQueries(db);
  const analyzer = new Analyzer(queries);

  // Check API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your-key-here') {
    console.error('❌ Set ANTHROPIC_API_KEY in .env first');
    process.exit(1);
  }

  // Step 1: Analyze
  console.log('📊 Analyzing data...');
  const analysis = await analyzer.analyzeDate(targetDate);

  const formattedAnalysis = analyzer.formatForPrompt(analysis);
  console.log('\n--- DATA SUMMARY ---');
  console.log(formattedAnalysis.slice(0, 2000));
  if (formattedAnalysis.length > 2000) console.log(`... (${formattedAnalysis.length} chars total)\n`);

  console.log(`Powder alerts: ${analysis.powderAlerts.length}`);
  console.log(`Milestones: ${analysis.milestones.length}`);
  console.log(`Trail openings (>5): ${analysis.biggestTrailOpenings.length}`);
  console.log(`Regions: ${analysis.regions.size}`);

  // Step 2: Build prompt
  const postCount = parseInt(process.env.POST_COUNT || '12', 10);
  const { system, user } = buildGenerationPrompt(formattedAnalysis, postCount);

  console.log(`\n🤖 Generating ${postCount} posts with Claude...\n`);

  // Step 3: Generate
  const generator = new ClaudeGenerator(apiKey);
  const posts = await generator.generatePosts(system, user, targetDate);

  // Step 4: Display results
  console.log('\n═══════════════════════════════════════════════');
  console.log('  GENERATED POSTS');
  console.log('═══════════════════════════════════════════════\n');

  posts.forEach((post, i) => {
    console.log(`[${i + 1}] (${post.post_type})`);
    console.log(`    ${post.original_content}`);
    console.log(`    → ${post.metadata.reasoning}`);
    console.log('');
  });

  // Step 5: Save to database
  console.log('💾 Saving posts to database...');
  for (const post of posts) {
    queries.insertPost(post);
  }
  console.log(`✅ ${posts.length} posts saved!\n`);

  // Summary stats
  const types = new Map<string, number>();
  for (const p of posts) {
    types.set(p.post_type, (types.get(p.post_type) || 0) + 1);
  }
  console.log('Post type distribution:');
  for (const [type, count] of [...types.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${type}: ${count}`);
  }

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
