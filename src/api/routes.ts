import { Router, Request, Response } from 'express';
import { DatabaseQueries } from '../db/queries';
import { DEFAULT_SYSTEM_PROMPT, readSystemPromptFromFile, writeSystemPromptToFile, buildGenerationPrompt } from '../services/masterPromptBuilder';
import { ClaudeGenerator } from '../services/claudeGenerator';
import { Analyzer } from '../services/analyzer';

interface ApiRouterOptions {
  scheduler?: { getSchedulePreview: () => Array<{ post: any; estimatedTime: Date }> };
  claudeGenerator?: ClaudeGenerator;
  analyzer?: Analyzer;
  triggerGeneration?: () => Promise<void>;
}

export function createApiRouter(
  queries: DatabaseQueries,
  options: ApiRouterOptions = {}
): Router {
  const router = Router();

  // GET /api/posts?status=approved&date=2026-02-16
  router.get('/posts', (req: Request, res: Response) => {
    const status = req.query.status as string | undefined;
    const date = req.query.date as string | undefined;
    let posts;
    if (status) {
      posts = queries.getPostsByStatus(status);
    } else if (date) {
      posts = queries.getPostsByDate(date);
    } else {
      const pending = queries.getPostsByStatus('pending');
      const approved = queries.getPostsByStatus('approved');
      posts = [...pending, ...approved];
    }
    res.json(posts);
  });

  // GET /api/posts/:id
  router.get('/posts/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const post = queries.getPostById(id);
    if (!post) { res.status(404).json({ error: 'Not found' }); return; }
    res.json(post);
  });

  // PATCH /api/posts/:id  { status?, final_content? }
  router.patch('/posts/:id', (req: Request, res: Response) => {
    const id = req.params.id as string;
    const post = queries.getPostById(id);
    if (!post) { res.status(404).json({ error: 'Not found' }); return; }
    queries.updatePost({ id, ...req.body });
    res.json(queries.getPostById(id));
  });

  // GET /api/stats
  router.get('/stats', (_req: Request, res: Response) => {
    const statuses = ['pending', 'approved', 'rejected', 'posted', 'archived'];
    const counts: Record<string, number> = {};
    for (const s of statuses) {
      counts[s] = queries.getPostsByStatus(s).length;
    }
    res.json({ counts, total: Object.values(counts).reduce((a, b) => a + b, 0) });
  });

  // GET /api/prompt
  router.get('/prompt', (_req: Request, res: Response) => {
    const override = queries.getLearningPreference('master_prompt_override');
    const filePrompt = readSystemPromptFromFile();
    res.json({
      prompt: override || filePrompt,
      isCustom: !!override || filePrompt !== DEFAULT_SYSTEM_PROMPT,
      default: filePrompt,
      factoryDefault: DEFAULT_SYSTEM_PROMPT,
    });
  });

  // PUT /api/prompt  { prompt: string }
  router.put('/prompt', (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt must be a string' });
      return;
    }

    // Write to git-tracked file
    const fileWritten = writeSystemPromptToFile(prompt);

    // Clear DB override — file is now the source of truth
    queries.setLearningPreference('master_prompt_override', null);

    res.json({
      saved: true,
      fileWritten,
      isCustom: prompt.trim() !== DEFAULT_SYSTEM_PROMPT.trim(),
    });
  });

  // POST /api/prompt/test  { prompt: string }
  router.post('/prompt/test', async (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      res.status(400).json({ error: 'prompt must be a non-empty string' });
      return;
    }

    if (!options.claudeGenerator || !options.analyzer) {
      res.status(503).json({ error: 'Test generation not available' });
      return;
    }

    try {
      // Find the most recent date with data
      const recentAggregates = queries.getAllHistoricalAggregates(1);
      if (recentAggregates.length === 0) {
        res.status(404).json({ error: 'No ski data available. Run a data fetch first.' });
        return;
      }

      const targetDate = recentAggregates[0].date;
      const analysis = await options.analyzer.analyzeDate(targetDate);
      const formattedAnalysis = options.analyzer.formatForPrompt(analysis);

      const { system, user } = buildGenerationPrompt(formattedAnalysis, 4, undefined, prompt);
      const posts = await options.claudeGenerator.generatePosts(system, user, targetDate);

      res.json({
        posts: posts.map(p => ({
          content: p.final_content,
          post_type: p.post_type,
          reasoning: p.metadata.reasoning,
          char_count: p.final_content.length,
        })),
        dataDate: targetDate,
      });
    } catch (err: any) {
      console.error('Test generation failed:', err.message);
      res.status(500).json({ error: `Generation failed: ${err.message}` });
    }
  });

  // POST /api/generate — manually trigger the daily generation pipeline
  router.post('/generate', async (_req: Request, res: Response) => {
    if (!options.triggerGeneration) {
      res.status(503).json({ error: 'Generation not available' });
      return;
    }
    try {
      res.json({ started: true, message: 'Generation triggered. Check Slack for results.' });
      // Run after responding so the request doesn't hang
      options.triggerGeneration().catch(err => console.error('Manual generation failed:', err.message));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/schedule
  router.get('/schedule', (_req: Request, res: Response) => {
    if (!options.scheduler) { res.json({ queue: [], message: 'Scheduler not running' }); return; }
    const preview = options.scheduler.getSchedulePreview();
    res.json({
      queue: preview.map(p => ({
        id: p.post.id,
        content: p.post.final_content,
        estimatedTime: p.estimatedTime.toISOString(),
        type: p.post.post_type,
      })),
    });
  });

  return router;
}
