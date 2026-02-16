import { TwitterApi } from 'twitter-api-v2';

export class TwitterPoster {
  private client: TwitterApi;

  constructor(config: {
    apiKey: string;
    apiKeySecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }) {
    this.client = new TwitterApi({
      appKey: config.apiKey,
      appSecret: config.apiKeySecret,
      accessToken: config.accessToken,
      accessSecret: config.accessTokenSecret,
    });
  }

  /**
   * Post a tweet. Returns the tweet ID on success.
   */
  async postTweet(text: string): Promise<{ tweetId: string; url: string }> {
    const result = await this.client.v2.tweet(text);
    const tweetId = result.data.id;
    // We don't have the username easily, but the ID is enough to construct a link later
    return {
      tweetId,
      url: `https://x.com/i/status/${tweetId}`,
    };
  }

  /**
   * Verify credentials work by fetching the authenticated user.
   */
  async verifyCredentials(): Promise<{ username: string; id: string }> {
    const me = await this.client.v2.me();
    return { username: me.data.username, id: me.data.id };
  }
}
