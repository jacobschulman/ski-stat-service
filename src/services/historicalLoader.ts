import { DatabaseQueries } from '../db/queries';
import { DataFetcher } from './dataFetcher';
import { AggregateData } from '../types/skiData';

export class HistoricalLoader {
  constructor(
    private db: DatabaseQueries,
    private fetcher: DataFetcher
  ) {}

  /**
   * Backfill historical aggregates from GitHub into the database
   */
  async backfillHistoricalData(startDate: string = '2025-12-19'): Promise<{
    total: number;
    successful: number;
    failed: number;
  }> {
    console.log('🔄 Starting historical data backfill...');
    console.log(`Start date: ${startDate}`);

    const dates = this.fetcher.generateKnownDateRange(startDate);
    console.log(`Total dates to fetch: ${dates.length}`);

    const results = await this.fetcher.fetchAggregatesInBatch(dates, 5);

    let successful = 0;
    let failed = 0;

    results.forEach((data, date) => {
      try {
        this.db.insertHistoricalAggregate(date, data);
        successful++;

        if (successful % 10 === 0) {
          console.log(`✓ Processed ${successful}/${dates.length} dates`);
        }
      } catch (error) {
        console.error(`Failed to insert ${date}:`, error);
        failed++;
      }
    });

    failed += dates.length - results.size;

    console.log(`\n✅ Backfill complete!`);
    console.log(`  Total: ${dates.length}`);
    console.log(`  Successful: ${successful}`);
    console.log(`  Failed: ${failed}`);

    return {
      total: dates.length,
      successful,
      failed
    };
  }

  /**
   * Load historical data for a specific date range
   */
  async loadHistoricalRange(startDate: string, endDate: string): Promise<Map<string, AggregateData>> {
    const data = this.db.getHistoricalAggregatesInRange(startDate, endDate);

    const results = new Map<string, AggregateData>();
    data.forEach(item => {
      results.set(item.date, item.data);
    });

    return results;
  }

  /**
   * Get data for N days ago
   */
  async getDataNDaysAgo(daysAgo: number): Promise<AggregateData | null> {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const dateStr = date.toISOString().split('T')[0];

    return this.db.getHistoricalAggregate(dateStr);
  }

  /**
   * Get the most recent N days of data
   */
  async getRecentHistory(days: number): Promise<Array<{ date: string; data: AggregateData }>> {
    return this.db.getAllHistoricalAggregates(days);
  }

  /**
   * Check if we have data for a specific date
   */
  hasDataForDate(date: string): boolean {
    return this.db.getHistoricalAggregate(date) !== null;
  }

  /**
   * Get data coverage statistics
   */
  getCoverageStats(): {
    total_days: number;
    date_range: { start: string; end: string } | null;
  } {
    const allData = this.db.getAllHistoricalAggregates();

    if (allData.length === 0) {
      return {
        total_days: 0,
        date_range: null
      };
    }

    const dates = allData.map(d => d.date).sort();

    return {
      total_days: allData.length,
      date_range: {
        start: dates[0],
        end: dates[dates.length - 1]
      }
    };
  }
}
