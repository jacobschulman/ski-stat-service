export interface VoiceProfile {
  tone: ToneProfile;
  common_words: Map<string, number>;
  avoided_words: Map<string, number>;
  style_examples: string[];
  edit_patterns: EditPatternSummary[];
  preferences: UserPreferences;
  updated_at: string;
}

export interface ToneProfile {
  formality: number; // 0-1, 0 = very casual, 1 = formal
  enthusiasm: number; // 0-1, 0 = subdued, 1 = very enthusiastic
  emoji_frequency: number; // average emojis per post
  exclamation_frequency: number; // average exclamation marks per post
  avg_post_length: number; // characters
}

export interface EditPatternSummary {
  pattern_type: string;
  before: string;
  after: string;
  frequency: number;
  confidence: number;
  examples: string[];
}

export interface UserPreferences {
  post_type_scores: Map<string, number>;
  resort_interests: Map<string, number>;
  category_weights: Map<string, number>;
  threshold_adjustments: {
    powder_alert_min_inches: number;
    trails_opening_min_count: number;
    trails_opening_min_pct: number;
    newsworthy_magnitude_threshold: number;
  };
}

export interface LearningMetrics {
  total_posts_generated: number;
  total_posts_approved: number;
  total_posts_rejected: number;
  total_edits: number;
  approval_rate: number;
  edit_rate: number;
  avg_edit_distance: number; // Levenshtein distance
  learning_velocity: number; // Rate of improvement
  last_updated: string;
}
