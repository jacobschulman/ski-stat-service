import { AggregateData, AggregateDataSchema, LatestSnowData, LatestSnowDataSchema } from '../types/skiData';

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com';

export class DataFetcher {
  private repo: string;
  private branch: string;

  constructor(repo: string = 'jacobschulman/ski-run-scraper-data', branch: string = 'main') {
    this.repo = repo;
    this.branch = branch;
  }

  /**
   * Fetch the latest aggregate data
   */
  async fetchLatestAggregate(): Promise<AggregateData> {
    const url = `${GITHUB_RAW_BASE}/${this.repo}/${this.branch}/data/aggregates/latest.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch latest aggregate: ${response.statusText}`);
    }

    const data = await response.json();
    return AggregateDataSchema.parse(data);
  }

  /**
   * Fetch aggregate data for a specific date
   */
  async fetchAggregateByDate(date: string): Promise<AggregateData> {
    // Date format: YYYY-MM-DD
    const url = `${GITHUB_RAW_BASE}/${this.repo}/${this.branch}/data/aggregates/${date}.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch aggregate for ${date}: ${response.statusText}`);
    }

    const data = await response.json();
    return AggregateDataSchema.parse(data);
  }

  /**
   * Fetch latest snow data (detailed resort information)
   */
  async fetchLatestSnowData(): Promise<LatestSnowData> {
    const url = `${GITHUB_RAW_BASE}/${this.repo}/${this.branch}/data/latest-snow.json`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch latest snow data: ${response.statusText}`);
    }

    const data = await response.json();
    return LatestSnowDataSchema.parse(data);
  }

  /**
   * Check if today's data is available (timestamp check)
   */
  async isTodaysDataReady(): Promise<boolean> {
    try {
      const latest = await this.fetchLatestAggregate();
      const dataTimestamp = new Date(latest.generated);
      const today = new Date();

      // Check if the data was generated today
      return dataTimestamp.toDateString() === today.toDateString();
    } catch (error) {
      console.error('Error checking if today\'s data is ready:', error);
      return false;
    }
  }

  /**
   * Get list of available aggregate dates
   * Note: This requires fetching the directory listing from GitHub API
   */
  async getAvailableAggregatesAPI(): Promise<string[]> {
    const url = `https://api.github.com/repos/${this.repo}/contents/data/aggregates`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch aggregates directory: ${response.statusText}`);
    }

    const files = await response.json() as Array<{ name: string }>;

    // Filter for .json files and extract dates
    const dates = files
      .filter((file) => file.name.endsWith('.json') && file.name.match(/^\d{4}-\d{2}-\d{2}\.json$/))
      .map((file) => file.name.replace('.json', ''))
      .sort();

    return dates;
  }

  /**
   * Generate date range for known aggregates (Dec 19, 2025 to today)
   * This is more reliable than API calls for our use case since we know the range
   */
  generateKnownDateRange(startDate: string = '2025-12-19'): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const today = new Date();

    for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    return dates;
  }

  /**
   * Batch fetch multiple aggregates
   */
  async fetchAggregatesInBatch(dates: string[], concurrency: number = 5): Promise<Map<string, AggregateData>> {
    const results = new Map<string, AggregateData>();

    // Process in batches to avoid overwhelming the server
    for (let i = 0; i < dates.length; i += concurrency) {
      const batch = dates.slice(i, i + concurrency);
      console.log(`Fetching batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(dates.length / concurrency)}`);

      const promises = batch.map(async date => {
        try {
          const data = await this.fetchAggregateByDate(date);
          return { date, data };
        } catch (error) {
          console.warn(`Failed to fetch ${date}:`, (error as Error).message);
          return null;
        }
      });

      const batchResults = await Promise.all(promises);

      batchResults.forEach(result => {
        if (result) {
          results.set(result.date, result.data);
        }
      });

      // Small delay between batches
      if (i + concurrency < dates.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    return results;
  }
}
