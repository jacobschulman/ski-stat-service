import { z } from 'zod';

// Aggregate data from GitHub repo
export const AggregateDataSchema = z.object({
  date: z.string(),
  generated: z.string(),
  superlatives: z.record(z.string(), z.any()).optional(),
  rankings: z.record(z.string(), z.array(z.object({
    resort: z.string(),
    name: z.string(),
    region: z.string().nullable(),
    value: z.number().nullable()
  }))).optional()
});

export type AggregateData = z.infer<typeof AggregateDataSchema>;

// Resort data from latest-snow.json
export const ResortDataSchema = z.object({
  date: z.string().optional(),
  name: z.string(),
  provider: z.string().optional(),
  conditions: z.string().nullable().optional(),
  currentTemp: z.number().nullable().optional(),
  overnight_inches: z.number().nullable().optional(),
  '24hour_cm': z.number().nullable().optional(),
  '48hour_inches': z.number().nullable().optional(),
  '7day_cm': z.number().nullable().optional(),
  season_total_inches: z.number().nullable().optional(),
  season_total_cm: z.number().nullable().optional(),
  base_depth_inches: z.number().nullable().optional(),
  base_depth_cm: z.number().nullable().optional(),
  totalTrails: z.number().nullable().optional(),
  openTrails: z.number().nullable().optional(),
  groomedTrails: z.number().nullable().optional(),
  totalLifts: z.number().nullable().optional(),
  openLifts: z.number().nullable().optional(),
  forecast: z.record(z.string(), z.any()).optional()
});

export type ResortData = z.infer<typeof ResortDataSchema>;

export const LatestSnowDataSchema = z.record(z.string(), ResortDataSchema);
export type LatestSnowData = z.infer<typeof LatestSnowDataSchema>;

// Ranking item
export interface RankingItem {
  resort: string;
  name: string;
  region: string | null;
  value: number | null;
}

// Historical comparison result
export interface ComparisonResult {
  today: number | null;
  yesterday: number | null;
  change: number | null;
  percentChange: number | null;
  weekAgo: number | null;
  monthAgo: number | null;
}

// Resort baseline
export interface ResortBaseline {
  resort_id: string;
  metric: string;
  value: number;
  sample_size: number;
  updated_at: string;
}

// Notable event
export interface NotableEvent {
  date: string;
  resort: string;
  event_type: string;
  description: string;
  metadata: any;
}
