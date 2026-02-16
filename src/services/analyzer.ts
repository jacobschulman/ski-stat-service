import { DatabaseQueries } from '../db/queries';
import { RankingItem } from '../types/skiData';

interface ResortChange {
  resort: string;
  name: string;
  region: string | null;
  metric: string;
  today: number;
  yesterday: number;
  change: number;
  percentChange: number | null;
}

interface DayAnalysis {
  date: string;
  generated: string;

  // Top performers
  topSnowOvernight: RankingItem[];
  topSnow24h: RankingItem[];
  topSnow7d: RankingItem[];
  topSeasonTotal: RankingItem[];
  topBaseDepth: RankingItem[];
  topTrailsOpen: RankingItem[];
  topTrailsPct: RankingItem[];
  topLiftsOpen: RankingItem[];

  // Regional aggregates
  regions: Map<string, {
    region: string;
    resortCount: number;
    avgSnowOvernight: number;
    avgSnow24h: number;
    avgTrailsPct: number;
    avgBaseDepth: number;
    totalTrailsOpen: number;
  }>;

  // Compared to yesterday
  biggestSnowGains: ResortChange[];
  biggestTrailOpenings: ResortChange[];
  biggestLiftOpenings: ResortChange[];

  // Compared to a week ago
  weekOverWeekTrends: ResortChange[];

  // Notable events
  powderAlerts: Array<{ resort: string; name: string; region: string | null; inches: number; timeframe: string }>;
  milestones: Array<{ resort: string; name: string; description: string }>;

  // Raw data for prompt
  rawRankings: Record<string, RankingItem[]>;
  rawSuperlatives: Record<string, any>;
}

export class Analyzer {
  constructor(private db: DatabaseQueries) {}

  async analyzeDate(targetDate: string): Promise<DayAnalysis> {
    const todayData = this.db.getHistoricalAggregate(targetDate);
    if (!todayData) {
      throw new Error(`No data found for ${targetDate}`);
    }

    // Find yesterday's date
    const yesterday = this.subtractDays(targetDate, 1);
    const yesterdayData = this.db.getHistoricalAggregate(yesterday);

    // Find a week ago
    const weekAgo = this.subtractDays(targetDate, 7);
    const weekAgoData = this.db.getHistoricalAggregate(weekAgo);

    const rankings = todayData.rankings || {};
    const superlatives = todayData.superlatives || {};

    // Build top lists (top 10 for each)
    const top = (key: string, n = 10): RankingItem[] =>
      (rankings[key] || []).filter((r: RankingItem) => r.value != null && r.value > 0).slice(0, n);

    // Regional aggregates
    const regions = this.buildRegionalAggregates(rankings);

    // Day-over-day changes
    const yesterdayRankings = yesterdayData?.rankings || {};
    const biggestSnowGains = this.findChanges(rankings, yesterdayRankings, 'snow_24h');
    const biggestTrailOpenings = this.findChanges(rankings, yesterdayRankings, 'trails_open_count');
    const biggestLiftOpenings = this.findChanges(rankings, yesterdayRankings, 'lifts_open_count');

    // Week-over-week
    const weekAgoRankings = weekAgoData?.rankings || {};
    const weekOverWeekTrends = this.findChanges(rankings, weekAgoRankings, 'snow_season');

    // Powder alerts (>6" overnight or >10" 24h)
    const powderAlerts = this.findPowderAlerts(rankings);

    // Milestones
    const milestones = this.findMilestones(rankings, yesterdayRankings);

    return {
      date: targetDate,
      generated: todayData.generated,
      topSnowOvernight: top('snow_overnight'),
      topSnow24h: top('snow_24h'),
      topSnow7d: top('snow_7day'),
      topSeasonTotal: top('snow_season'),
      topBaseDepth: top('base_depth'),
      topTrailsOpen: top('trails_open_count'),
      topTrailsPct: top('trails_open_pct'),
      topLiftsOpen: top('lifts_open_count'),
      regions,
      biggestSnowGains,
      biggestTrailOpenings: biggestTrailOpenings.filter(c => c.change >= 5),
      biggestLiftOpenings: biggestLiftOpenings.filter(c => c.change >= 2),
      weekOverWeekTrends,
      powderAlerts,
      milestones,
      rawRankings: rankings,
      rawSuperlatives: superlatives,
    };
  }

  private buildRegionalAggregates(rankings: Record<string, RankingItem[]>) {
    const regions = new Map<string, {
      region: string;
      resortCount: number;
      avgSnowOvernight: number;
      avgSnow24h: number;
      avgTrailsPct: number;
      avgBaseDepth: number;
      totalTrailsOpen: number;
    }>();

    // Use trails_open_pct as base to get all resorts with regions
    const allResorts = rankings['trails_open_pct'] || [];
    const overnightMap = this.buildResortMap(rankings['snow_overnight'] || []);
    const snow24hMap = this.buildResortMap(rankings['snow_24h'] || []);
    const baseDepthMap = this.buildResortMap(rankings['base_depth'] || []);
    const trailsCountMap = this.buildResortMap(rankings['trails_open_count'] || []);

    for (const resort of allResorts) {
      if (!resort.region) continue;

      let agg = regions.get(resort.region);
      if (!agg) {
        agg = { region: resort.region, resortCount: 0, avgSnowOvernight: 0, avgSnow24h: 0, avgTrailsPct: 0, avgBaseDepth: 0, totalTrailsOpen: 0 };
        regions.set(resort.region, agg);
      }

      agg.resortCount++;
      agg.avgSnowOvernight += (overnightMap.get(resort.resort) ?? 0);
      agg.avgSnow24h += (snow24hMap.get(resort.resort) ?? 0);
      agg.avgTrailsPct += (resort.value ?? 0);
      agg.avgBaseDepth += (baseDepthMap.get(resort.resort) ?? 0);
      agg.totalTrailsOpen += (trailsCountMap.get(resort.resort) ?? 0);
    }

    // Convert sums to averages
    for (const agg of regions.values()) {
      if (agg.resortCount > 0) {
        agg.avgSnowOvernight /= agg.resortCount;
        agg.avgSnow24h /= agg.resortCount;
        agg.avgTrailsPct /= agg.resortCount;
        agg.avgBaseDepth /= agg.resortCount;
      }
    }

    return regions;
  }

  private buildResortMap(rankings: RankingItem[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const r of rankings) {
      if (r.value != null) map.set(r.resort, r.value);
    }
    return map;
  }

  private findChanges(
    todayRankings: Record<string, RankingItem[]>,
    yesterdayRankings: Record<string, RankingItem[]>,
    metric: string
  ): ResortChange[] {
    const todayMap = this.buildResortMap(todayRankings[metric] || []);
    const yesterdayMap = this.buildResortMap(yesterdayRankings[metric] || []);
    const nameMap = new Map<string, { name: string; region: string | null }>();

    for (const r of todayRankings[metric] || []) {
      nameMap.set(r.resort, { name: r.name, region: r.region });
    }

    const changes: ResortChange[] = [];

    for (const [resort, todayVal] of todayMap) {
      const yesterdayVal = yesterdayMap.get(resort);
      if (yesterdayVal == null) continue;

      const change = todayVal - yesterdayVal;
      if (change === 0) continue;

      const info = nameMap.get(resort)!;
      changes.push({
        resort,
        name: info.name,
        region: info.region,
        metric,
        today: todayVal,
        yesterday: yesterdayVal,
        change,
        percentChange: yesterdayVal > 0 ? (change / yesterdayVal) * 100 : null,
      });
    }

    changes.sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
    return changes.slice(0, 15);
  }

  private findPowderAlerts(rankings: Record<string, RankingItem[]>) {
    const alerts: Array<{ resort: string; name: string; region: string | null; inches: number; timeframe: string }> = [];

    for (const r of rankings['snow_overnight'] || []) {
      if (r.value != null && r.value >= 6) {
        alerts.push({ resort: r.resort, name: r.name, region: r.region, inches: r.value, timeframe: 'overnight' });
      }
    }

    for (const r of rankings['snow_24h'] || []) {
      if (r.value != null && r.value >= 10) {
        const alreadyAlerted = alerts.some(a => a.resort === r.resort);
        if (!alreadyAlerted) {
          alerts.push({ resort: r.resort, name: r.name, region: r.region, inches: r.value, timeframe: '24h' });
        }
      }
    }

    return alerts;
  }

  private findMilestones(
    todayRankings: Record<string, RankingItem[]>,
    yesterdayRankings: Record<string, RankingItem[]>
  ) {
    const milestones: Array<{ resort: string; name: string; description: string }> = [];

    // Check for season total milestones (100", 150", 200", 250", 300")
    const todaySeasonMap = this.buildResortMap(todayRankings['snow_season'] || []);
    const yesterdaySeasonMap = this.buildResortMap(yesterdayRankings['snow_season'] || []);
    const thresholds = [100, 150, 200, 250, 300];

    for (const [resort, todayVal] of todaySeasonMap) {
      const yesterdayVal = yesterdaySeasonMap.get(resort);
      if (yesterdayVal == null) continue;

      for (const threshold of thresholds) {
        if (todayVal >= threshold && yesterdayVal < threshold) {
          const info = (todayRankings['snow_season'] || []).find(r => r.resort === resort);
          if (info) {
            milestones.push({
              resort,
              name: info.name,
              description: `Crossed ${threshold}" season total (now at ${todayVal}")`,
            });
          }
        }
      }
    }

    // Check for 100% trails open
    for (const r of todayRankings['trails_open_pct'] || []) {
      if (r.value !== 1) continue;
      const yesterdayEntry = (yesterdayRankings['trails_open_pct'] || []).find(yr => yr.resort === r.resort);
      if (yesterdayEntry && yesterdayEntry.value != null && yesterdayEntry.value < 1) {
        milestones.push({
          resort: r.resort,
          name: r.name,
          description: 'Reached 100% trails open',
        });
      }
    }

    return milestones;
  }

  private subtractDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - days);
    return d.toISOString().split('T')[0];
  }

  /**
   * Format the analysis as a concise text summary for the Claude prompt
   */
  formatForPrompt(analysis: DayAnalysis): string {
    const lines: string[] = [];

    lines.push(`=== SKI RESORT DATA FOR ${analysis.date} ===\n`);

    // Top snow
    if (analysis.topSnowOvernight.some(r => (r.value ?? 0) > 0)) {
      lines.push('OVERNIGHT SNOWFALL (top resorts):');
      for (const r of analysis.topSnowOvernight.slice(0, 8)) {
        lines.push(`  ${r.name} (${r.region}): ${r.value}"`);
      }
      lines.push('');
    }

    if (analysis.topSnow24h.some(r => (r.value ?? 0) > 0)) {
      lines.push('24-HOUR SNOWFALL (top resorts):');
      for (const r of analysis.topSnow24h.slice(0, 8)) {
        lines.push(`  ${r.name} (${r.region}): ${r.value}"`);
      }
      lines.push('');
    }

    lines.push('7-DAY SNOWFALL (top 8):');
    for (const r of analysis.topSnow7d.slice(0, 8)) {
      lines.push(`  ${r.name} (${r.region}): ${r.value}"`);
    }
    lines.push('');

    lines.push('SEASON TOTALS (top 8):');
    for (const r of analysis.topSeasonTotal.slice(0, 8)) {
      lines.push(`  ${r.name} (${r.region}): ${r.value}"`);
    }
    lines.push('');

    lines.push('DEEPEST BASE DEPTH (top 8):');
    for (const r of analysis.topBaseDepth.slice(0, 8)) {
      lines.push(`  ${r.name} (${r.region}): ${r.value}"`);
    }
    lines.push('');

    lines.push('MOST TRAILS OPEN (top 8):');
    for (const r of analysis.topTrailsOpen.slice(0, 8)) {
      lines.push(`  ${r.name} (${r.region}): ${r.value} trails`);
    }
    lines.push('');

    lines.push('HIGHEST % TRAILS OPEN (top 8):');
    for (const r of analysis.topTrailsPct.slice(0, 8)) {
      lines.push(`  ${r.name} (${r.region}): ${((r.value ?? 0) * 100).toFixed(0)}%`);
    }
    lines.push('');

    // Regional breakdown
    lines.push('REGIONAL AVERAGES:');
    const sortedRegions = [...analysis.regions.entries()].sort((a, b) => b[1].avgSnow24h - a[1].avgSnow24h);
    for (const [, agg] of sortedRegions) {
      lines.push(`  ${agg.region} (${agg.resortCount} resorts): avg overnight ${agg.avgSnowOvernight.toFixed(1)}", avg 24h ${agg.avgSnow24h.toFixed(1)}", avg base ${agg.avgBaseDepth.toFixed(1)}", avg trails open ${(agg.avgTrailsPct * 100).toFixed(0)}%, total trails open: ${agg.totalTrailsOpen}`);
    }
    lines.push('');

    // Day-over-day changes
    if (analysis.biggestSnowGains.length > 0) {
      lines.push('BIGGEST 24H SNOW CHANGES VS YESTERDAY:');
      for (const c of analysis.biggestSnowGains.slice(0, 8)) {
        const sign = c.change > 0 ? '+' : '';
        lines.push(`  ${c.name} (${c.region}): ${sign}${c.change}" (was ${c.yesterday}", now ${c.today}")`);
      }
      lines.push('');
    }

    if (analysis.biggestTrailOpenings.length > 0) {
      lines.push('BIGGEST TRAIL OPENINGS VS YESTERDAY:');
      for (const c of analysis.biggestTrailOpenings.slice(0, 8)) {
        lines.push(`  ${c.name} (${c.region}): +${c.change} trails (was ${c.yesterday}, now ${c.today})`);
      }
      lines.push('');
    }

    if (analysis.biggestLiftOpenings.length > 0) {
      lines.push('BIGGEST LIFT OPENINGS VS YESTERDAY:');
      for (const c of analysis.biggestLiftOpenings.slice(0, 8)) {
        lines.push(`  ${c.name} (${c.region}): +${c.change} lifts (was ${c.yesterday}, now ${c.today})`);
      }
      lines.push('');
    }

    // Week-over-week
    if (analysis.weekOverWeekTrends.length > 0) {
      lines.push('BIGGEST SEASON TOTAL GAINS VS 1 WEEK AGO:');
      for (const c of analysis.weekOverWeekTrends.filter(t => t.change > 0).slice(0, 5)) {
        lines.push(`  ${c.name} (${c.region}): +${c.change}" in the past week (now ${c.today}" season total)`);
      }
      lines.push('');
    }

    // Powder alerts
    if (analysis.powderAlerts.length > 0) {
      lines.push('POWDER ALERTS:');
      for (const a of analysis.powderAlerts) {
        lines.push(`  ${a.name} (${a.region}): ${a.inches}" ${a.timeframe}`);
      }
      lines.push('');
    }

    // Milestones
    if (analysis.milestones.length > 0) {
      lines.push('MILESTONES:');
      for (const m of analysis.milestones) {
        lines.push(`  ${m.name}: ${m.description}`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}
