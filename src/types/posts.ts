export type PostStatus = 'pending' | 'approved' | 'rejected' | 'posted' | 'archived';

export type PostType =
  | 'powder_alert'
  | 'leaderboard'
  | 'regional_comparison'
  | 'trend_spotting'
  | 'hidden_gem'
  | 'weekend_planning'
  | 'milestone'
  | 'resort_spotlight'
  | 'comparative_story'
  | 'forecast_heads_up'
  | 'other';

export interface Post {
  id: string;
  created_at: string;
  generation_date: string;
  status: PostStatus;
  post_type: PostType;
  original_content: string;
  final_content: string;
  data_snapshot: any;
  metadata: {
    reasoning?: string;
    key_stats?: string[];
    claude_response?: any;
    tweet_id?: string;
    tweet_url?: string;
    posted_at?: string;
  };
  edit_diff?: {
    added: string[];
    removed: string[];
    changes: Array<{
      before: string;
      after: string;
    }>;
  };
}

export interface PostFeedback {
  id: string;
  post_id: string;
  action: 'approved' | 'rejected' | 'edited' | 'regenerated';
  timestamp: string;
  edit_before?: string;
  edit_after?: string;
  feedback_note?: string;
}

export interface EditPattern {
  id: string;
  pattern_type: 'word_replacement' | 'tone_shift' | 'fact_correction' | 'style_adjustment';
  before_text: string;
  after_text: string;
  frequency: number;
  confidence: number;
}
