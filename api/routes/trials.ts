import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { recomputeProgramStatus } from '../services/ruleService.js';
import type { TrialWeld } from '../../shared/types.js';
import { resolveOperatorFromRole } from '../../shared/types.js';

const router = Router();

function operator(req: Request): string {
  const roleKey = req.headers['x-operator'] as string | undefined;
  const nameHeader = req.headers['x-operator-name'] as string | undefined;
  if (nameHeader) {
    try {
      return decodeURIComponent(nameHeader);
    } catch {
      // fallthrough
    }
  }
  return resolveOperatorFromRole(roleKey);
}

router.get('/', (req: Request, res: Response): void => {
  const { program_id } = req.query;
  const rows = program_id
    ? db
        .prepare(
          'SELECT tb.*, wp.program_code, wp.version, wp.name FROM trial_batches tb JOIN welding_programs wp ON tb.program_id=wp.id WHERE tb.program_id=? ORDER BY tb.id DESC'
        )
        .all(program_id)
    : db
        .prepare(
          'SELECT tb.*, wp.program_code, wp.version, wp.name FROM trial_batches tb JOIN welding_programs wp ON tb.program_id=wp.id ORDER BY tb.id DESC'
        )
        .all();
  const data = (rows as any[]).map((b) => {
    const welds = db
      .prepare('SELECT * FROM trial_welds WHERE batch_id=? ORDER BY id')
      .all(b.id) as TrialWeld[];
    return { ...b, welds };
  });
  res.json({ success: true, data });
});

router.post('/', (req: Request, res: Response): void => {
  const { program_id, weld_count } = req.body;
  const count = Number(weld_count) || 3;
  if (!program_id) {
    res.status(400).json({ success: false, error: '请选择程序版本' });
    return;
  }
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id=?')
    .get(program_id) as { status: string } | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  if (!['pending_trial', 'trialing', 'ready_to_publish'].includes(program.status)) {
    res.status(400).json({ success: false, error: '当前状态不可安排试焊' });
    return;
  }
  db.transaction(() => {
    const seq =
      (db.prepare('SELECT COUNT(*) as c FROM trial_batches').get() as { c: number }).c + 1;
    const batch_no = `TB-2026-${String(seq).padStart(3, '0')}`;
    const info = db
      .prepare(
        'INSERT INTO trial_batches (batch_no, program_id, weld_count, status, arranged_by) VALUES (?,?,?,?,?)'
      )
      .run(batch_no, program_id, count, 'trialing', operator(req));
    const batchId = info.lastInsertRowid as number;
    for (let i = 1; i <= count; i++) {
      db.prepare('INSERT INTO trial_welds (weld_no, batch_id, status) VALUES (?,?,?)').run(
        `W-${batchId}-${i}`,
        batchId,
        'pending'
      );
    }
    recomputeProgramStatus(program_id);
  })();
  res.json({ success: true });
});

router.get('/:id/welds', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const welds = db
    .prepare('SELECT * FROM trial_welds WHERE batch_id=? ORDER BY id')
    .all(id);
  res.json({ success: true, data: welds });
});

export default router;
