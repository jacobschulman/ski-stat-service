import { Router, Request, Response } from 'express';
import { DatabaseQueries } from '../db/queries';
import { DEFAULT_SYSTEM_PROMPT } from '../services/masterPromptBuilder';

export function createApiRouter(
  queries: DatabaseQueries,
  scheduler?: { getSchedulePreview: () => Array<{ post: any; estimatedTime: Date }> }
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
    res.json({
      prompt: override || DEFAULT_SYSTEM_PROMPT,
      isCustom: !!override,
      default: DEFAULT_SYSTEM_PROMPT,
    });
  });

  // PUT /api/prompt  { prompt: string }
  router.put('/prompt', (req: Request, res: Response) => {
    const { prompt } = req.body;
    if (typeof prompt !== 'string') {
      res.status(400).json({ error: 'prompt must be a string' });
      return;
    }
    // If it matches the default exactly, clear the override
    if (prompt.trim() === DEFAULT_SYSTEM_PROMPT.trim()) {
      queries.setLearningPreference('master_prompt_override', null);
      res.json({ saved: true, isCustom: false });
    } else {
      queries.setLearningPreference('master_prompt_override', prompt);
      res.json({ saved: true, isCustom: true });
    }
  });

  // GET /api/schedule
  router.get('/schedule', (_req: Request, res: Response) => {
    if (!scheduler) { res.json({ queue: [], message: 'Scheduler not running' }); return; }
    const preview = scheduler.getSchedulePreview();
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
