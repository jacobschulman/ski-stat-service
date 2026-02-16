import { ComparisonResult } from './skiData';

export interface AnalysisContext {
  date: string;
  resorts: Map<string, ResortAnalysis>;
  regionalAggregates: Map<string, RegionalAggregate>;
  superlatives: Superlatives;
  notableChanges: NotableChange[];
  historicalContext: HistoricalContext;
}

export interface ResortAnalysis {
  resort_id: string;
  name: string;
  region: string | null;

  // Current metrics
  overnight_snow: number | null;
  snow_24h: number | null;
  snow_48h: number | null;
  snow_7d: number | null;
  season_total: number | null;
  base_depth: number | null;
  trails_open: number | null;
  trails_open_pct: number | null;
  lifts_open: number | null;
  lifts_open_pct: number | null;

  // Comparisons
  snow_24h_change: ComparisonResult | null;
  trails_open_change: ComparisonResult | null;
  lifts_open_change: ComparisonResult | null;

  // Baseline context
  snow_vs_baseline: number | null; // How much above/below average
  trails_vs_baseline: number | null;

  // Notable flags
  is_powder_day: boolean;
  is_major_opening: boolean;
  is_milestone: boolean;
  milestone_description?: string;
}

export interface RegionalAggregate {
  region: string;
  resort_count: number;
  avg_overnight_snow: number;
  avg_snow_24h: number;
  avg_base_depth: number;
  avg_trails_open_pct: number;
  total_open_trails: number;
  total_trails: number;
}

export interface Superlatives {
  most_overnight_snow: string | null;
  most_24h_snow: string | null;
  most_7d_snow: string | null;
  deepest_base: string | null;
  most_trails_open: string | null;
  best_trails_open_pct: string | null;
}

export interface NotableChange {
  resort_id: string;
  resort_name: string;
  change_type: 'trails_opened' | 'lifts_opened' | 'major_snow' | 'milestone';
  description: string;
  magnitude: number;
  is_newsworthy: boolean;
}

export interface HistoricalContext {
  date: string;
  season_week: number; // Which week of the season (1-20)
  days_since_last_storm: number;
  regional_trends: Map<string, string>; // region -> trend description
}
