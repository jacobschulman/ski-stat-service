import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import { Post, PostType } from '../types/posts';

interface GeneratedPost {
  content: string;
  post_type: string;
  key_stats: string[];
  reasoning: string;
}

// Tool definition for structured output — the API handles JSON escaping,
// so Claude can freely use " for inches without breaking anything.
const SUBMIT_POSTS_TOOL: Anthropic.Tool = {
  name: 'submit_posts',
  description: 'Submit the generated social media posts',
  input_schema: {
    type: 'object' as const,
    properties: {
      posts: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'The actual post text for X/Twitter' },
            post_type: {
              type: 'string',
              enum: [
                'powder_alert', 'leaderboard', 'regional_comparison', 'trend_spotting',
                'hidden_gem', 'weekend_planning', 'milestone', 'resort_spotlight',
                'comparative_story', 'forecast_heads_up', 'other',
              ],
            },
            key_stats: { type: 'array', items: { type: 'string' }, description: 'Key stats that inspired this post' },
            reasoning: { type: 'string', description: '1 sentence on why this is interesting' },
          },
          required: ['content', 'post_type', 'key_stats', 'reasoning'],
        },
      },
    },
    required: ['posts'],
  },
};

export class ClaudeGenerator {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-sonnet-4-5-20250929') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generatePosts(
    system: string,
    userPrompt: string,
    generationDate: string
  ): Promise<Post[]> {
    console.log(`Calling Claude API (${this.model})...`);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: userPrompt }],
      tools: [SUBMIT_POSTS_TOOL],
      tool_choice: { type: 'tool', name: 'submit_posts' },
    });

    // Extract structured data from tool_use block (no manual JSON parsing needed)
    const toolBlock = response.content.find(b => b.type === 'tool_use');
    if (!toolBlock || toolBlock.type !== 'tool_use') {
      throw new Error('No tool_use response from Claude');
    }

    const input = toolBlock.input as { posts: GeneratedPost[] };
    const generated = input.posts;

    if (!Array.isArray(generated)) {
      throw new Error('Claude response does not contain a posts array');
    }

    // Convert to Post objects
    const posts: Post[] = generated.map(g => ({
      id: uuid(),
      created_at: new Date().toISOString(),
      generation_date: generationDate,
      status: 'pending' as const,
      post_type: this.normalizePostType(g.post_type),
      original_content: g.content,
      final_content: g.content,
      data_snapshot: {},
      metadata: {
        reasoning: g.reasoning,
        key_stats: g.key_stats,
      },
    }));

    console.log(`Generated ${posts.length} posts`);
    console.log(`Usage: ${response.usage.input_tokens} input, ${response.usage.output_tokens} output tokens`);

    return posts;
  }

  private normalizePostType(raw: string): PostType {
    const valid: PostType[] = [
      'powder_alert', 'leaderboard', 'regional_comparison', 'trend_spotting',
      'hidden_gem', 'weekend_planning', 'milestone', 'resort_spotlight',
      'comparative_story', 'forecast_heads_up', 'other',
    ];
    return valid.includes(raw as PostType) ? (raw as PostType) : 'other';
  }
}
