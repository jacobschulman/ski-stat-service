import Database from 'better-sqlite3';
import { Post, PostFeedback, EditPattern } from '../types/posts';
import { ResortBaseline } from '../types/skiData';

export class DatabaseQueries {
  constructor(private db: Database.Database) {}

  // ========== Historical Aggregates ==========

  insertHistoricalAggregate(date: string, data: any, notableEvents?: any): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO historical_aggregates (date, data, fetched_at, notable_events)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(
      date,
      JSON.stringify(data),
      new Date().toISOString(),
      notableEvents ? JSON.stringify(notableEvents) : null
    );
  }

  getHistoricalAggregate(date: string): any | null {
    const stmt = this.db.prepare('SELECT data FROM historical_aggregates WHERE date = ?');
    const row = stmt.get(date) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : null;
  }

  getAllHistoricalAggregates(limit?: number): Array<{ date: string; data: any }> {
    const query = limit
      ? 'SELECT date, data FROM historical_aggregates ORDER BY date DESC LIMIT ?'
      : 'SELECT date, data FROM historical_aggregates ORDER BY date DESC';

    const stmt = this.db.prepare(query);
    const rows = limit ? stmt.all(limit) : stmt.all();

    return (rows as Array<{ date: string; data: string }>).map(row => ({
      date: row.date,
      data: JSON.parse(row.data)
    }));
  }

  getHistoricalAggregatesInRange(startDate: string, endDate: string): Array<{ date: string; data: any }> {
    const stmt = this.db.prepare(`
      SELECT date, data FROM historical_aggregates
      WHERE date >= ? AND date <= ?
      ORDER BY date ASC
    `);
    const rows = stmt.all(startDate, endDate) as Array<{ date: string; data: string }>;

    return rows.map(row => ({
      date: row.date,
      data: JSON.parse(row.data)
    }));
  }

  // ========== Resort Baselines ==========

  insertOrUpdateBaseline(baseline: Omit<ResortBaseline, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO resort_baselines (resort_id, metric, value, sample_size, updated_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(resort_id, metric) DO UPDATE SET
        value = excluded.value,
        sample_size = excluded.sample_size,
        updated_at = excluded.updated_at
    `);
    stmt.run(
      baseline.resort_id,
      baseline.metric,
      baseline.value,
      baseline.sample_size,
      baseline.updated_at
    );
  }

  getBaselineForResort(resortId: string, metric: string): number | null {
    const stmt = this.db.prepare(`
      SELECT value FROM resort_baselines
      WHERE resort_id = ? AND metric = ?
    `);
    const row = stmt.get(resortId, metric) as { value: number } | undefined;
    return row ? row.value : null;
  }

  getAllBaselinesForResort(resortId: string): Map<string, number> {
    const stmt = this.db.prepare(`
      SELECT metric, value FROM resort_baselines
      WHERE resort_id = ?
    `);
    const rows = stmt.all(resortId) as Array<{ metric: string; value: number }>;

    const baselines = new Map<string, number>();
    rows.forEach(row => {
      baselines.set(row.metric, row.value);
    });
    return baselines;
  }

  // ========== Posts ==========

  insertPost(post: Post): void {
    const stmt = this.db.prepare(`
      INSERT INTO posts (
        id, created_at, generation_date, status, post_type,
        original_content, final_content, data_snapshot, metadata, edit_diff
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      post.id,
      post.created_at,
      post.generation_date,
      post.status,
      post.post_type,
      post.original_content,
      post.final_content,
      JSON.stringify(post.data_snapshot),
      JSON.stringify(post.metadata),
      post.edit_diff ? JSON.stringify(post.edit_diff) : null
    );
  }

  updatePost(post: Partial<Post> & { id: string }): void {
    const fields: string[] = [];
    const values: any[] = [];

    if (post.status) {
      fields.push('status = ?');
      values.push(post.status);
    }
    if (post.final_content) {
      fields.push('final_content = ?');
      values.push(post.final_content);
    }
    if (post.edit_diff) {
      fields.push('edit_diff = ?');
      values.push(JSON.stringify(post.edit_diff));
    }

    if (fields.length === 0) return;

    values.push(post.id);
    const stmt = this.db.prepare(`
      UPDATE posts SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);
  }

  getPostById(id: string): Post | null {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return null;

    return this.parsePostRow(row);
  }

  getPostsByDate(date: string): Post[] {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE generation_date = ? ORDER BY created_at DESC');
    const rows = stmt.all(date) as any[];
    return rows.map(row => this.parsePostRow(row));
  }

  getPostsByStatus(status: string): Post[] {
    const stmt = this.db.prepare('SELECT * FROM posts WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as any[];
    return rows.map(row => this.parsePostRow(row));
  }

  updatePostMetadata(id: string, metadata: any): void {
    const stmt = this.db.prepare(`UPDATE posts SET metadata = ? WHERE id = ?`);
    stmt.run(JSON.stringify(metadata), id);
  }

  private parsePostRow(row: any): Post {
    return {
      id: row.id,
      created_at: row.created_at,
      generation_date: row.generation_date,
      status: row.status,
      post_type: row.post_type,
      original_content: row.original_content,
      final_content: row.final_content,
      data_snapshot: JSON.parse(row.data_snapshot),
      metadata: JSON.parse(row.metadata),
      edit_diff: row.edit_diff ? JSON.parse(row.edit_diff) : undefined
    };
  }

  // ========== Post Feedback ==========

  insertPostFeedback(feedback: PostFeedback): void {
    const stmt = this.db.prepare(`
      INSERT INTO post_feedback (id, post_id, action, timestamp, edit_before, edit_after, feedback_note)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      feedback.id,
      feedback.post_id,
      feedback.action,
      feedback.timestamp,
      feedback.edit_before || null,
      feedback.edit_after || null,
      feedback.feedback_note || null
    );
  }

  getFeedbackForPost(postId: string): PostFeedback[] {
    const stmt = this.db.prepare('SELECT * FROM post_feedback WHERE post_id = ? ORDER BY timestamp ASC');
    const rows = stmt.all(postId) as any[];
    return rows;
  }

  // ========== Learning Preferences ==========

  setLearningPreference(metric: string, value: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO learning_preferences (metric, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(metric) DO UPDATE SET
        value = excluded.value,
        updated_at = excluded.updated_at
    `);
    stmt.run(metric, JSON.stringify(value), new Date().toISOString());
  }

  getLearningPreference(metric: string): any | null {
    const stmt = this.db.prepare('SELECT value FROM learning_preferences WHERE metric = ?');
    const row = stmt.get(metric) as { value: string } | undefined;
    return row ? JSON.parse(row.value) : null;
  }

  // ========== Edit Patterns ==========

  insertOrUpdateEditPattern(pattern: EditPattern): void {
    const stmt = this.db.prepare(`
      INSERT INTO edit_patterns (id, pattern_type, before_text, after_text, frequency, confidence, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        frequency = excluded.frequency,
        confidence = excluded.confidence,
        updated_at = excluded.updated_at
    `);
    const now = new Date().toISOString();
    stmt.run(
      pattern.id,
      pattern.pattern_type,
      pattern.before_text,
      pattern.after_text,
      pattern.frequency,
      pattern.confidence,
      now,
      now
    );
  }

  getEditPatterns(minConfidence: number = 0.7): EditPattern[] {
    const stmt = this.db.prepare(`
      SELECT * FROM edit_patterns
      WHERE confidence >= ?
      ORDER BY frequency DESC, confidence DESC
    `);
    const rows = stmt.all(minConfidence) as any[];
    return rows;
  }
}
