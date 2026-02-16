import { App, BlockAction, BlockElementAction } from '@slack/bolt';
import { DatabaseQueries } from '../db/queries';
import { Post } from '../types/posts';
import { v4 as uuid } from 'uuid';

export class SlackBot {
  private app: App;
  private db: DatabaseQueries;
  private channelId: string | null = null;

  constructor(db: DatabaseQueries, config: {
    botToken: string;
    appToken: string; // Socket Mode requires an app-level token
    signingSecret: string;
    channelName?: string;
  }) {
    this.db = db;

    this.app = new App({
      token: config.botToken,
      appToken: config.appToken,
      signingSecret: config.signingSecret,
      socketMode: true, // No public URL needed - perfect for Unraid
    });

    this.registerHandlers();
  }

  async start() {
    await this.app.start();
    console.log('✓ Slack bot connected (Socket Mode)');

    // Find or use the configured channel
    if (!this.channelId) {
      this.channelId = process.env.SLACK_CHANNEL_ID || null;
    }
  }

  async stop() {
    await this.app.stop();
  }

  /**
   * Post a batch of generated posts to the Slack channel for review
   */
  async postForReview(posts: Post[]) {
    if (!this.channelId) {
      console.error('No SLACK_CHANNEL_ID configured');
      return;
    }

    // Header message
    await this.app.client.chat.postMessage({
      channel: this.channelId,
      text: `${posts.length} new ski posts ready for review`,
      blocks: [
        {
          type: 'header',
          text: { type: 'plain_text', text: `${posts.length} New Ski Posts Ready` },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `Generated for *${posts[0]?.generation_date}* | Approve, edit, or reject below` },
          ],
        },
        { type: 'divider' },
      ],
    });

    // Post each candidate as a separate message with buttons
    for (const post of posts) {
      await this.postSingleForReview(post);
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 300));
    }
  }

  private async postSingleForReview(post: Post) {
    if (!this.channelId) return;

    const typeEmoji = this.getTypeEmoji(post.post_type);
    const charCount = post.original_content.length;

    await this.app.client.chat.postMessage({
      channel: this.channelId,
      text: post.original_content,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: post.original_content,
          },
        },
        {
          type: 'context',
          elements: [
            { type: 'mrkdwn', text: `${typeEmoji} *${post.post_type}* | ${charCount} chars` },
            ...(post.metadata.reasoning
              ? [{ type: 'mrkdwn' as const, text: `_${post.metadata.reasoning}_` }]
              : []),
          ],
        },
        {
          type: 'actions',
          block_id: `post_actions_${post.id}`,
          elements: [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Approve' },
              style: 'primary',
              action_id: 'approve_post',
              value: post.id,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Edit' },
              action_id: 'edit_post',
              value: post.id,
            },
            {
              type: 'button',
              text: { type: 'plain_text', text: 'Reject' },
              style: 'danger',
              action_id: 'reject_post',
              value: post.id,
            },
          ],
        },
      ],
    });
  }

  private registerHandlers() {
    // Approve button
    this.app.action('approve_post', async ({ ack, body, client }) => {
      await ack();
      const action = (body as BlockAction).actions[0] as BlockElementAction;
      const postId = 'value' in action ? action.value : undefined;
      if (!postId) return;

      // Update post status
      this.db.updatePost({ id: postId, status: 'approved' });
      this.db.insertPostFeedback({
        id: uuid(),
        post_id: postId,
        action: 'approved',
        timestamp: new Date().toISOString(),
      });

      // Update the Slack message
      const blockAction = body as BlockAction;
      if (blockAction.message && blockAction.channel) {
        await client.chat.update({
          channel: blockAction.channel.id,
          ts: blockAction.message.ts,
          text: 'Post approved',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `~${this.db.getPostById(postId)?.original_content || ''}~\n\n*Approved*`,
              },
            },
          ],
        });
      }

      console.log(`Post ${postId} approved`);
    });

    // Edit button - opens modal
    this.app.action('edit_post', async ({ ack, body, client }) => {
      await ack();
      const action = (body as BlockAction).actions[0] as BlockElementAction;
      const postId = 'value' in action ? action.value : undefined;
      if (!postId) return;

      const post = this.db.getPostById(postId);
      if (!post) return;

      const blockAction = body as BlockAction;
      await client.views.open({
        trigger_id: blockAction.trigger_id!,
        view: {
          type: 'modal',
          callback_id: 'edit_post_modal',
          private_metadata: JSON.stringify({
            postId,
            channelId: blockAction.channel?.id,
            messageTs: blockAction.message?.ts,
          }),
          title: { type: 'plain_text', text: 'Edit Post' },
          submit: { type: 'plain_text', text: 'Save & Approve' },
          blocks: [
            {
              type: 'input',
              block_id: 'post_content',
              element: {
                type: 'plain_text_input',
                action_id: 'content_input',
                initial_value: post.original_content,
                multiline: true,
                max_length: 300,
              },
              label: { type: 'plain_text', text: 'Post Content' },
            },
            {
              type: 'context',
              elements: [
                { type: 'mrkdwn', text: `Original: _${post.original_content}_` },
              ],
            },
          ],
        },
      });
    });

    // Edit modal submission
    this.app.view('edit_post_modal', async ({ ack, view, client }) => {
      await ack();

      const metadata = JSON.parse(view.private_metadata);
      const newContent = view.state.values.post_content.content_input.value;
      if (!newContent) return;

      const post = this.db.getPostById(metadata.postId);
      if (!post) return;

      // Save edited version
      this.db.updatePost({
        id: metadata.postId,
        status: 'approved',
        final_content: newContent,
      });

      this.db.insertPostFeedback({
        id: uuid(),
        post_id: metadata.postId,
        action: 'edited',
        timestamp: new Date().toISOString(),
        edit_before: post.original_content,
        edit_after: newContent,
      });

      // Update the Slack message
      if (metadata.channelId && metadata.messageTs) {
        await client.chat.update({
          channel: metadata.channelId,
          ts: metadata.messageTs,
          text: 'Post edited and approved',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `~${post.original_content}~\n\n*Edited & Approved:*\n${newContent}`,
              },
            },
          ],
        });
      }

      console.log(`Post ${metadata.postId} edited and approved`);
    });

    // Reject button
    this.app.action('reject_post', async ({ ack, body, client }) => {
      await ack();
      const action = (body as BlockAction).actions[0] as BlockElementAction;
      const postId = 'value' in action ? action.value : undefined;
      if (!postId) return;

      this.db.updatePost({ id: postId, status: 'rejected' });
      this.db.insertPostFeedback({
        id: uuid(),
        post_id: postId,
        action: 'rejected',
        timestamp: new Date().toISOString(),
      });

      // Update the Slack message
      const blockAction = body as BlockAction;
      if (blockAction.message && blockAction.channel) {
        await client.chat.update({
          channel: blockAction.channel.id,
          ts: blockAction.message.ts,
          text: 'Post rejected',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `~${this.db.getPostById(postId)?.original_content || ''}~\n\n*Rejected*`,
              },
            },
          ],
        });
      }

      console.log(`Post ${postId} rejected`);
    });
  }

  private getTypeEmoji(postType: string): string {
    const emojis: Record<string, string> = {
      powder_alert: ':snowflake:',
      leaderboard: ':bar_chart:',
      regional_comparison: ':earth_americas:',
      trend_spotting: ':chart_with_upwards_trend:',
      hidden_gem: ':gem:',
      weekend_planning: ':calendar:',
      milestone: ':trophy:',
      resort_spotlight: ':mountain:',
      comparative_story: ':left_right_arrow:',
      forecast_heads_up: ':partly_sunny:',
    };
    return emojis[postType] || ':speech_balloon:';
  }
}
