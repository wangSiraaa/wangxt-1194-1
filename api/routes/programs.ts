import { Router, type Request, type Response } from 'express';
import db from '../db.js';
import {
  canPublish,
  canDelete,
  canRetire,
  canRollback,
  getProgramWelds,
  getImpactScope,
  getVersionLineage,
  retireProgram,
  rollbackProgram,
  autoRetirePreviousProduction,
} from '../services/ruleService.js';
import type {
  WeldingProgram,
  ProgramDetail,
  ProgramProgress,
  TrialBatch,
  TrialWeld,
  QualityResult,
  ReleaseRecord,
  WeldStatus,
} from '../../shared/types.js';
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

function buildProgress(welds: { status: string }[]): ProgramProgress {
  const total = welds.length;
  const qualified = welds.filter((w) => w.status === 'qualified').length;
  const unqualified = welds.filter((w) => w.status === 'unqualified').length;
  const pending = welds.filter((w) => w.status === 'pending').length;
  return { total, inspected: qualified + unqualified, qualified, unqualified, pending };
}

router.get('/', (_req: Request, res: Response): void => {
  const programs = db
    .prepare('SELECT * FROM welding_programs ORDER BY id ASC')
    .all() as WeldingProgram[];
  const list = programs.map((p) => ({ ...p, progress: buildProgress(getProgramWelds(p.id)) }));
  res.json({ success: true, data: list });
});

router.get('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const program = db
    .prepare('SELECT * FROM welding_programs WHERE id = ?')
    .get(id) as WeldingProgram | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  const batches = db
    .prepare('SELECT * FROM trial_batches WHERE program_id = ? ORDER BY id')
    .all(id) as TrialBatch[];
  const weldRows = getProgramWelds(id);
  const welds: TrialWeld[] = weldRows.map((w) => ({
    id: w.id,
    weld_no: w.weld_no,
    batch_id: w.batch_id,
    status: w.status as WeldStatus,
    created_at: w.created_at,
  }));
  const weldIds = welds.map((w) => w.id);
  const results = weldIds.length
    ? db
        .prepare(
          `SELECT * FROM quality_results WHERE weld_id IN (${weldIds.map(() => '?').join(',')})`
        )
        .all(...weldIds) as QualityResult[]
    : [] as QualityResult[];
  const releases = db
    .prepare('SELECT * FROM release_records WHERE program_id = ? ORDER BY id')
    .all(id) as ReleaseRecord[];
  const detail: ProgramDetail = {
    ...program,
    batches,
    welds,
    results,
    releases,
    progress: buildProgress(welds),
    impact_scope: getImpactScope(program.program_code),
    version_lineage: getVersionLineage(id),
  };
  res.json({ success: true, data: detail });
});

router.post('/', (req: Request, res: Response): void => {
  const { program_code, version, name, parameters, submit } = req.body;
  if (!program_code || !version || !name) {
    res.status(400).json({ success: false, error: '请填写程序编号、版本号与名称' });
    return;
  }
  const status = submit ? 'pending_trial' : 'draft';
  const info = db
    .prepare(
      'INSERT INTO welding_programs (program_code, version, name, parameters, status, created_by) VALUES (?,?,?,?,?,?)'
    )
    .run(program_code, version, name, parameters || '', status, operator(req));
  res.json({ success: true, data: { id: info.lastInsertRowid } });
});

router.put('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(id) as { status: string } | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  if (program.status !== 'draft') {
    res.status(400).json({ success: false, error: '仅草稿状态可编辑' });
    return;
  }
  const { program_code, version, name, parameters } = req.body;
  db.prepare(
    "UPDATE welding_programs SET program_code=?, version=?, name=?, parameters=?, updated_at=datetime('now','localtime') WHERE id=?"
  ).run(program_code, version, name, parameters || '', id);
  res.json({ success: true });
});

router.post('/:id/submit', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(id) as { status: string } | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  if (program.status !== 'draft') {
    res.status(400).json({ success: false, error: '仅草稿状态可提交' });
    return;
  }
  db.prepare(
    "UPDATE welding_programs SET status='pending_trial', updated_at=datetime('now','localtime') WHERE id=?"
  ).run(id);
  res.json({ success: true });
});

router.delete('/:id', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const check = canDelete(id);
  if (!check.ok) {
    res.status(400).json({ success: false, error: check.reason });
    return;
  }
  db.transaction(() => {
    db.prepare(
      'DELETE FROM quality_results WHERE weld_id IN (SELECT tw.id FROM trial_welds tw JOIN trial_batches tb ON tw.batch_id=tb.id WHERE tb.program_id=?)'
    ).run(id);
    db.prepare(
      'DELETE FROM trial_welds WHERE batch_id IN (SELECT id FROM trial_batches WHERE program_id=?)'
    ).run(id);
    db.prepare('DELETE FROM trial_batches WHERE program_id=?').run(id);
    db.prepare('DELETE FROM release_records WHERE program_id=?').run(id);
    db.prepare('DELETE FROM welding_programs WHERE id=?').run(id);
  })();
  res.json({ success: true });
});

router.post('/:id/publish', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const check = canPublish(id);
  if (!check.ok) {
    res.status(400).json({ success: false, error: check.reason });
    return;
  }
  db.transaction(() => {
    db.prepare(
      "UPDATE welding_programs SET status='published', updated_at=datetime('now','localtime') WHERE id=?"
    ).run(id);
    db.prepare(
      'INSERT INTO release_records (program_id, released_by, in_production) VALUES (?,?,0)'
    ).run(id, operator(req));
  })();
  res.json({ success: true });
});

router.post('/:id/mark-production', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const program = db
    .prepare('SELECT status, program_code FROM welding_programs WHERE id = ?')
    .get(id) as { status: string; program_code: string } | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  if (program.status !== 'published') {
    res.status(400).json({ success: false, error: '仅已发布程序可标记量产' });
    return;
  }
  const op = operator(req);
  db.transaction(() => {
    autoRetirePreviousProduction(program.program_code, id, op);
    db.prepare(
      "UPDATE welding_programs SET status='in_production', updated_at=datetime('now','localtime') WHERE id=?"
    ).run(id);
    db.prepare('UPDATE release_records SET in_production=1 WHERE program_id=?').run(id);
  })();
  res.json({ success: true });
});

router.post('/:id/retire', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const check = canRetire(id);
  if (!check.ok) {
    res.status(400).json({ success: false, error: check.reason });
    return;
  }
  retireProgram(id, operator(req));
  res.json({ success: true });
});

router.post('/:id/rollback', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const check = canRollback(id);
  if (!check.ok) {
    res.status(400).json({ success: false, error: check.reason });
    return;
  }
  const { program_code } = rollbackProgram(id, operator(req));
  res.json({ success: true, data: { program_code } });
});

router.get('/:id/impact-scope', (req: Request, res: Response): void => {
  const id = Number(req.params.id);
  const program = db
    .prepare('SELECT program_code FROM welding_programs WHERE id = ?')
    .get(id) as { program_code: string } | undefined;
  if (!program) {
    res.status(404).json({ success: false, error: '程序不存在' });
    return;
  }
  res.json({ success: true, data: getImpactScope(program.program_code) });
});

export default router;
