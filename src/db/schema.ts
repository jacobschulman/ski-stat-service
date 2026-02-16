import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export function initDatabase(dbPath: string = './data/ski-stats.db'): Database.Database {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  createTables(db);

  return db;
}

function createTables(db: Database.Database): void {
  // Historical aggregates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS historical_aggregates (
      date TEXT PRIMARY KEY,
      data TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      notable_events TEXT
    );
  `);

  // Resort baselines table
  db.exec(`
    CREATE TABLE IF NOT EXISTS resort_baselines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      resort_id TEXT NOT NULL,
      metric TEXT NOT NULL,
      value REAL NOT NULL,
      sample_size INTEGER NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(resort_id, metric)
    );
  `);

  // Posts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      generation_date TEXT NOT NULL,
      status TEXT NOT NULL,
      post_type TEXT NOT NULL,
      original_content TEXT NOT NULL,
      final_content TEXT NOT NULL,
      data_snapshot TEXT NOT NULL,
      metadata TEXT NOT NULL,
      edit_diff TEXT
    );
  `);

  // Post feedback table
  db.exec(`
    CREATE TABLE IF NOT EXISTS post_feedback (
      id TEXT PRIMARY KEY,
      post_id TEXT NOT NULL,
      action TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      edit_before TEXT,
      edit_after TEXT,
      feedback_note TEXT,
      FOREIGN KEY (post_id) REFERENCES posts(id)
    );
  `);

  // Content strategy state table
  db.exec(`
    CREATE TABLE IF NOT EXISTS content_strategy_state (
      date TEXT PRIMARY KEY,
      post_types_used TEXT NOT NULL,
      topics_covered TEXT NOT NULL,
      generated_count INTEGER NOT NULL,
      approved_count INTEGER NOT NULL
    );
  `);

  // Learning preferences table
  db.exec(`
    CREATE TABLE IF NOT EXISTS learning_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Edit patterns table
  db.exec(`
    CREATE TABLE IF NOT EXISTS edit_patterns (
      id TEXT PRIMARY KEY,
      pattern_type TEXT NOT NULL,
      before_text TEXT NOT NULL,
      after_text TEXT NOT NULL,
      frequency INTEGER NOT NULL DEFAULT 1,
      confidence REAL NOT NULL,
      examples TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // Create indices for better performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_posts_generation_date ON posts(generation_date);
    CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);
    CREATE INDEX IF NOT EXISTS idx_posts_post_type ON posts(post_type);
    CREATE INDEX IF NOT EXISTS idx_post_feedback_post_id ON post_feedback(post_id);
    CREATE INDEX IF NOT EXISTS idx_post_feedback_action ON post_feedback(action);
    CREATE INDEX IF NOT EXISTS idx_resort_baselines_resort_id ON resort_baselines(resort_id);
    CREATE INDEX IF NOT EXISTS idx_historical_aggregates_date ON historical_aggregates(date);
  `);

  console.log('✓ Database tables created successfully');
}

export function closeDatabase(db: Database.Database): void {
  db.close();
}
