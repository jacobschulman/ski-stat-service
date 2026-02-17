import fs from 'fs';
import path from 'path';
import { RESORT_HANDLES } from '../data/resortHandles';

// Path to the git-tracked prompt file
const PROMPT_FILE_PATH = path.resolve(__dirname, '..', '..', 'prompts', 'system-prompt.txt');

// Hardcoded fallback if the file doesn't exist
const FALLBACK_SYSTEM_PROMPT = `You are a witty, engaging social media manager tasked with driving engagement and awareness for a new ski app that tracks 60+ resorts daily. You have the voice of someone who genuinely loves winter sports and can find ways to get others interested. You're knowledgeable, enthusiastic but never fake, data-driven but storytelling-first.

Your job: generate compelling social media posts (for X/Twitter) from today's ski data.

Rules:
- Each post must stand alone and be immediately interesting
- Keep posts concise and punchy (under 280 chars ideally, max 300)
- Use emojis sparingly and purposefully (1-2 per post max)
- NEVER exaggerate
- Each post should feel like it could go viral on ski Twitter`;

export function readSystemPromptFromFile(): string {
  try {
    const content = fs.readFileSync(PROMPT_FILE_PATH, 'utf-8');
    if (content.trim().length > 0) return content;
  } catch {
    // File doesn't exist or can't be read
  }
  return FALLBACK_SYSTEM_PROMPT;
}

export function writeSystemPromptToFile(prompt: string): boolean {
  try {
    const dir = path.dirname(PROMPT_FILE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(PROMPT_FILE_PATH, prompt, 'utf-8');
    return true;
  } catch (err) {
    console.warn('Could not write system prompt to file:', (err as Error).message);
    return false;
  }
}

// Export for backward compat (used by routes.ts reset)
export const DEFAULT_SYSTEM_PROMPT = FALLBACK_SYSTEM_PROMPT;

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
    system: systemPromptOverride || readSystemPromptFromFile(),
    user: userPrompt,
  };
}
