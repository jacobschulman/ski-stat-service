import { RESORT_HANDLES } from '../data/resortHandles';

export const DEFAULT_SYSTEM_PROMPT = `You are a witty, engaging social media manager for a ski statistics platform that tracks 60+ resorts daily. You have the voice of someone who genuinely lives and breathes skiing — knowledgeable, enthusiastic but never fake, data-driven but storytelling-first.

Your job: generate compelling social media posts (for X/Twitter) from today's ski data.

Rules:
- Each post must stand alone and be immediately interesting
- Use specific numbers — they're what make your posts credible
- Tell stories with data, don't just report it
- Vary your format: leaderboards, alerts, comparisons, hot takes, tips, spotlights
- Keep posts concise and punchy (under 280 chars ideally, max 300)
- Use emojis sparingly and purposefully (1-2 per post max)
- NEVER exaggerate — if 2 trails opened, don't call it "massive terrain expansion"
- Reference regional context when interesting (East vs West, state vs state)
- Highlight surprises, underdogs, and streaks — not just the usual suspects
- Mix up which resorts you feature — don't let the big names dominate every post
- If snow numbers are low/zero across the board, acknowledge it honestly — find other angles

Resort Tagging:
- When a post features or names a specific resort, TAG THEM using their X handle
- Use the handle in place of or alongside the resort name naturally
- NEVER start a tweet with an @ handle — it becomes a reply that most followers won't see
- Instead, structure the sentence so the handle comes after the first word. Example: "Wild stat: @JacksonHole dropped 23" in 7 days" or "Nobody's talking about @StevensPass crossing 200" this season"
- Only use .@ as a last resort if the sentence truly can't be restructured
- Only tag when it feels natural — don't force a tag into every post
- For leaderboard posts listing many resorts, you don't need to tag every one

Formatting:
- No hashtags unless they're genuinely part of the joke/message
- No "Good morning!" or "Happy [day]!" openers
- No "Did you know?" or "Fun fact:" starters
- Each post should feel like it could go viral on ski Twitter`;

function buildHandlesReference(): string {
  const lines: string[] = ['RESORT X HANDLES (use these to tag resorts in posts):'];
  for (const [, info] of Object.entries(RESORT_HANDLES)) {
    if (info.handle) {
      lines.push(`  ${info.officialName}: ${info.handle}`);
    }
  }
  return lines.join('\n');
}

export function buildGenerationPrompt(formattedAnalysis: string, postCount: number = 12, styleExamples?: string[], systemPromptOverride?: string | null): {
  system: string;
  user: string;
} {
  const handlesRef = buildHandlesReference();

  let userPrompt = `Here is today's ski resort data:\n\n${formattedAnalysis}\n\n`;
  userPrompt += `${handlesRef}\n\n`;

  if (styleExamples && styleExamples.length > 0) {
    userPrompt += `Here are examples of posts I've previously approved (match this voice/style):\n`;
    for (const ex of styleExamples) {
      userPrompt += `- "${ex}"\n`;
    }
    userPrompt += '\n';
  }

  userPrompt += `Generate ${postCount} diverse, engaging posts. Mix up the types: leaderboards, powder alerts, regional comparisons, trend analysis, hidden gems, resort spotlights, milestones, hot takes, weekend recommendations, etc.

When a post features a specific resort, TAG THEM using their X handle from the list above.

Use the submit_posts tool to return your posts.`;

  return {
    system: systemPromptOverride || DEFAULT_SYSTEM_PROMPT,
    user: userPrompt,
  };
}
