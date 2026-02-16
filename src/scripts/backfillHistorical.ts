import 'dotenv/config';
import { initDatabase } from '../db/schema';
import { DatabaseQueries } from '../db/queries';
import { DataFetcher } from '../services/dataFetcher';
import { HistoricalLoader } from '../services/historicalLoader';

async function main() {
  console.log('═══════════════════════════════════════════════');
  console.log('  Historical Data Backfill Script');
  console.log('═══════════════════════════════════════════════\n');

  // Initialize database
  const dbPath = process.env.DATABASE_PATH || './data/ski-stats.db';
  console.log(`Database: ${dbPath}`);

  const db = initDatabase(dbPath);
  const queries = new DatabaseQueries(db);

  // Initialize services
  const repo = process.env.GITHUB_DATA_REPO || 'jacobschulman/ski-run-scraper-data';
  const branch = process.env.GITHUB_BRANCH || 'main';

  console.log(`Repository: ${repo}`);
  console.log(`Branch: ${branch}\n`);

  const fetcher = new DataFetcher(repo, branch);
  const loader = new HistoricalLoader(queries, fetcher);

  // Check current coverage
  console.log('Current database coverage:');
  const stats = loader.getCoverageStats();

  if (stats.total_days > 0 && stats.date_range) {
    console.log(`  ${stats.total_days} days of data`);
    console.log(`  Range: ${stats.date_range.start} to ${stats.date_range.end}\n`);

    const proceed = process.argv.includes('--force');
    if (!proceed) {
      console.log('⚠️  Database already contains historical data.');
      console.log('   Run with --force to re-fetch and update.\n');
      console.log('   Example: npm run backfill -- --force\n');
      process.exit(0);
    } else {
      console.log('🔄 --force flag detected, proceeding with backfill...\n');
    }
  } else {
    console.log('  No data found. Starting fresh backfill...\n');
  }

  // Run backfill
  const startDate = process.env.HISTORICAL_START_DATE || '2025-12-19';

  try {
    const results = await loader.backfillHistoricalData(startDate);

    console.log('\n═══════════════════════════════════════════════');
    console.log('  Backfill Summary');
    console.log('═══════════════════════════════════════════════');
    console.log(`Total dates processed: ${results.total}`);
    console.log(`Successfully imported: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Success rate: ${((results.successful / results.total) * 100).toFixed(1)}%`);

    // Show updated coverage
    const newStats = loader.getCoverageStats();
    console.log('\nUpdated database coverage:');
    console.log(`  ${newStats.total_days} days of data`);

    if (newStats.date_range) {
      console.log(`  Range: ${newStats.date_range.start} to ${newStats.date_range.end}`);
    }

    console.log('\n✅ Backfill complete!\n');
  } catch (error) {
    console.error('\n❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
