import { Router, type Request, type Response } from 'express';
import db from '../db.js';

const router = Router();

router.get('/stats', (_req: Request, res: Response): void => {
  const rows = db
    .prepare('SELECT status, COUNT(*) as c FROM welding_programs GROUP BY status')
    .all() as { status: string; c: number }[];
  const stats: Record<string, number> = {
    draft: 0,
    pending_trial: 0,
    trialing: 0,
    ready_to_publish: 0,
    published: 0,
    locked: 0,
    in_production: 0,
    retired: 0,
  };
  for (const r of rows) stats[r.status] = r.c;
  const total = rows.reduce((s, r) => s + r.c, 0);
  const pendingWelds = (
    db
      .prepare("SELECT COUNT(*) as c FROM trial_welds WHERE status='pending'")
      .get() as { c: number }
  ).c;
  const pendingTrialPrograms = (
    db
      .prepare("SELECT COUNT(*) as c FROM welding_programs WHERE status='pending_trial'")
      .get() as { c: number }
  ).c;
  const readyToPublish = (
    db
      .prepare("SELECT COUNT(*) as c FROM welding_programs WHERE status='ready_to_publish'")
      .get() as { c: number }
  ).c;
  res.json({
    success: true,
    data: {
      stats: { ...stats, total },
      todos: { pendingWelds, pendingTrialPrograms, readyToPublish },
    },
  });
});

export default router;
