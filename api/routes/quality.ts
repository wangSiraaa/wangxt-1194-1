import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import { recomputeProgramStatus } from '../services/ruleService.js';
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

router.get('/pending', (_req: Request, res: Response): void => {
  const rows = db
    .prepare(
      `SELECT tw.id, tw.weld_no, tw.batch_id, tb.program_id, tb.batch_no,
              wp.program_code, wp.version, wp.name
       FROM trial_welds tw
       JOIN trial_batches tb ON tw.batch_id = tb.id
       JOIN welding_programs wp ON tb.program_id = wp.id
       WHERE tw.status='pending'
       ORDER BY tw.id`
    )
    .all();
  res.json({ success: true, data: rows });
});

router.post('/', (req: Request, res: Response): void => {
  const { weld_id, tensile_strength, appearance_grade, result, remark } = req.body;
  if (!weld_id || !result) {
    res.status(400).json({ success: false, error: '缺少试焊件或检测结论' });
    return;
  }
  const weld = db
    .prepare('SELECT id, batch_id FROM trial_welds WHERE id=?')
    .get(weld_id) as { id: number; batch_id: number } | undefined;
  if (!weld) {
    res.status(404).json({ success: false, error: '试焊件不存在' });
    return;
  }
  const batch = db
    .prepare('SELECT program_id FROM trial_batches WHERE id=?')
    .get(weld.batch_id) as { program_id: number };
  db.transaction(() => {
    db.prepare('UPDATE trial_welds SET status=? WHERE id=?').run(result, weld_id);
    const exist = db.prepare('SELECT id FROM quality_results WHERE weld_id=?').get(weld_id);
    if (exist) {
      db.prepare(
        "UPDATE quality_results SET tensile_strength=?, appearance_grade=?, result=?, inspected_by=?, remark=?, inspected_at=datetime('now','localtime') WHERE weld_id=?"
      ).run(tensile_strength, appearance_grade, result, operator(req), remark || '', weld_id);
    } else {
      db.prepare(
        'INSERT INTO quality_results (weld_id, tensile_strength, appearance_grade, result, inspected_by, remark) VALUES (?,?,?,?,?,?)'
      ).run(weld_id, tensile_strength, appearance_grade, result, operator(req), remark || '');
    }
    const pending = (
      db
        .prepare('SELECT COUNT(*) as c FROM trial_welds WHERE batch_id=? AND status=?')
        .get(weld.batch_id, 'pending') as { c: number }
    ).c;
    if (pending === 0) {
      db.prepare('UPDATE trial_batches SET status=? WHERE id=?').run('completed', weld.batch_id);
    }
    recomputeProgramStatus(batch.program_id);
  })();
  res.json({ success: true, data: { program_id: batch.program_id } });
});

export default router;
