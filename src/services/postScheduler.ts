import { DatabaseQueries } from '../db/queries';
import { TwitterPoster } from './twitterPoster';
import { Post } from '../types/posts';

interface SchedulerConfig {
  /** Hours between posts (e.g., 1.5 = every 90 minutes) */
  intervalHours: number;
  /** Earliest hour to post (24h format, e.g., 9 for 9 AM) */
  startHour: number;
  /** Latest hour to post (24h format, e.g., 21 for 9 PM) */
  endHour: number;
}

const DEFAULT_CONFIG: SchedulerConfig = {
  intervalHours: 1.5,
  startHour: 9,
  endHour: 21,
};

export class PostScheduler {
  private db: DatabaseQueries;
  private poster: TwitterPoster;
  private config: SchedulerConfig;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(db: DatabaseQueries, poster: TwitterPoster, config?: Partial<SchedulerConfig>) {
    this.db = db;
    this.poster = poster;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the scheduler. Checks every minute if it's time to post.
   */
  start(): void {
    console.log(`📅 Post scheduler started`);
    console.log(`   Posting window: ${this.config.startHour}:00 – ${this.config.endHour}:00`);
    console.log(`   Interval: every ${this.config.intervalHours} hours`);

    // Check immediately on start
    this.checkAndPost();

    // Then check every minute
    this.timer = setInterval(() => this.checkAndPost(), 60_000);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    console.log('📅 Post scheduler stopped');
  }

  /**
   * Check if we should post right now, and if so, post the next approved tweet.
   */
  private async checkAndPost(): Promise<void> {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();

    // Outside posting window
    if (hour < this.config.startHour || hour >= this.config.endHour) {
      return;
    }

    // Check if enough time has passed since last post
    const lastPosted = this.getLastPostedTime();
    if (lastPosted) {
      const hoursSinceLast = (now.getTime() - lastPosted.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < this.config.intervalHours) {
        return;
      }
    } else {
      // No posts today yet — only post on the first check at the start of the window,
      // or at the top of an interval-aligned slot
      const minutesSinceStart = (hour - this.config.startHour) * 60 + minute;
      const intervalMinutes = this.config.intervalHours * 60;
      const minuteIntoSlot = minutesSinceStart % intervalMinutes;
      // Allow a 2-minute window at the start of each slot
      if (minuteIntoSlot > 2) {
        return;
      }
    }

    await this.postNext();
  }

  /**
   * Post the next approved post to X. Called by the scheduler or manually.
   */
  async postNext(): Promise<Post | null> {
    const approved = this.db.getPostsByStatus('approved');
    if (approved.length === 0) {
      return null;
    }

    // Post the oldest approved one first (FIFO)
    const post = approved[approved.length - 1];
    const content = post.final_content;

    try {
      console.log(`\n🐦 Posting to X: "${content.slice(0, 60)}..."`);
      const result = await this.poster.postTweet(content);

      // Update post status
      this.db.updatePost({
        id: post.id,
        status: 'posted',
      });

      // Store tweet URL in metadata
      const existingMeta = post.metadata || {};
      this.db.updatePostMetadata(post.id, {
        ...existingMeta,
        tweet_id: result.tweetId,
        tweet_url: result.url,
        posted_at: new Date().toISOString(),
      });

      console.log(`✅ Posted! ${result.url}`);
      console.log(`   ${approved.length - 1} approved posts remaining in queue`);

      return post;
    } catch (error: any) {
      console.error(`❌ Failed to post to X: ${error.message}`);
      // Don't change status — it stays approved for retry
      return null;
    }
  }

  /**
   * Get posting schedule preview — shows when each approved post would go out.
   */
  getSchedulePreview(): Array<{ post: Post; estimatedTime: Date }> {
    const approved = this.db.getPostsByStatus('approved');
    if (approved.length === 0) return [];

    // Reverse so oldest first
    const queue = [...approved].reverse();

    const now = new Date();
    const preview: Array<{ post: Post; estimatedTime: Date }> = [];
    let nextSlot = this.getNextSlot(now);

    for (const post of queue) {
      if (!nextSlot) break;
      preview.push({ post, estimatedTime: nextSlot });
      nextSlot = this.getNextSlot(new Date(nextSlot.getTime() + 1000 * 60));
    }

    return preview;
  }

  /**
   * Get the next available posting slot from a given time.
   */
  private getNextSlot(from: Date): Date | null {
    const slot = new Date(from);

    // If before today's window, start at window open
    if (slot.getHours() < this.config.startHour) {
      slot.setHours(this.config.startHour, 0, 0, 0);
      return slot;
    }

    // If after today's window, return tomorrow's first slot
    if (slot.getHours() >= this.config.endHour) {
      slot.setDate(slot.getDate() + 1);
      slot.setHours(this.config.startHour, 0, 0, 0);
      return slot;
    }

    // Find next interval-aligned slot
    const minutesSinceStart = (slot.getHours() - this.config.startHour) * 60 + slot.getMinutes();
    const intervalMinutes = this.config.intervalHours * 60;
    const slotsElapsed = Math.ceil(minutesSinceStart / intervalMinutes);
    const nextSlotMinutes = slotsElapsed * intervalMinutes;

    const nextSlot = new Date(slot);
    nextSlot.setHours(this.config.startHour, 0, 0, 0);
    nextSlot.setMinutes(nextSlot.getMinutes() + nextSlotMinutes);

    // If that pushes past end of window, go to tomorrow
    if (nextSlot.getHours() >= this.config.endHour) {
      nextSlot.setDate(nextSlot.getDate() + 1);
      nextSlot.setHours(this.config.startHour, 0, 0, 0);
    }

    return nextSlot;
  }

  /**
   * Get the last time we posted to X today.
   */
  private getLastPostedTime(): Date | null {
    const today = new Date().toISOString().split('T')[0];
    const posted = this.db.getPostsByStatus('posted');

    // Find most recent post from today
    for (const post of posted) {
      if (post.generation_date === today && post.metadata?.posted_at) {
        return new Date(post.metadata.posted_at);
      }
    }

    return null;
  }
}
