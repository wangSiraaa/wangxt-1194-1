import db from '../db.js';
import type { ProgramStatus } from '../../shared/types.js';

interface WeldRow {
  id: number;
  weld_no: string;
  batch_id: number;
  status: string;
}

function getProgramWelds(programId: number): WeldRow[] {
  return db
    .prepare(
      `SELECT tw.id, tw.weld_no, tw.batch_id, tw.status
       FROM trial_welds tw
       JOIN trial_batches tb ON tw.batch_id = tb.id
       WHERE tb.program_id = ?`
    )
    .all(programId) as WeldRow[];
}

function touch(programId: number) {
  db.prepare(
    "UPDATE welding_programs SET updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(programId);
}

/**
 * 根据试焊件与质量结果重新计算程序状态(核心状态机)
 * - 任一不合格 -> locked(锁定)
 * - 已发布/量产状态保持(除非出现不合格)
 * - 无试焊件 -> pending_trial(草稿除外)
 * - 仍有待检测 -> trialing
 * - 全部合格完成 -> ready_to_publish
 */
export function recomputeProgramStatus(programId: number): ProgramStatus {
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(programId) as { status: ProgramStatus } | undefined;
  if (!program) return 'draft';

  const welds = getProgramWelds(programId);
  const unqualifiedCount = welds.filter((w) => w.status === 'unqualified').length;

  // 门禁规则二:质量结果不合格要锁定该版本
  if (unqualifiedCount > 0) {
    db.prepare(
      "UPDATE welding_programs SET status = 'locked', updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(programId);
    return 'locked';
  }

  // 已发布或量产状态保持不变
  if (program.status === 'published' || program.status === 'in_production') {
    return program.status;
  }

  // 无试焊件 -> 待试焊(草稿保持草稿)
  if (welds.length === 0) {
    if (program.status !== 'draft') {
      db.prepare(
        "UPDATE welding_programs SET status = 'pending_trial', updated_at = datetime('now','localtime') WHERE id = ?"
      ).run(programId);
      return 'pending_trial';
    }
    return 'draft';
  }

  const pendingCount = welds.filter((w) => w.status === 'pending').length;
  if (pendingCount > 0) {
    db.prepare(
      "UPDATE welding_programs SET status = 'trialing', updated_at = datetime('now','localtime') WHERE id = ?"
    ).run(programId);
    return 'trialing';
  }

  // 全部检测完成且全部合格 -> 待发布
  db.prepare(
    "UPDATE welding_programs SET status = 'ready_to_publish', updated_at = datetime('now','localtime') WHERE id = ?"
  ).run(programId);
  return 'ready_to_publish';
}

/**
 * 门禁规则一:未完成试焊不能发布新程序
 * 发布前检查所有试焊件检测完成且全部合格
 */
export function canPublish(programId: number): { ok: boolean; reason?: string } {
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(programId) as { status: ProgramStatus } | undefined;
  if (!program) return { ok: false, reason: '程序不存在' };
  if (program.status === 'locked')
    return { ok: false, reason: '版本已锁定(存在不合格结果),不可发布' };
  if (program.status === 'published' || program.status === 'in_production')
    return { ok: false, reason: '程序已发布,无需重复发布' };

  const welds = getProgramWelds(programId);
  if (welds.length === 0)
    return { ok: false, reason: '未安排试焊批次,不可发布' };

  const pendingCount = welds.filter((w) => w.status === 'pending').length;
  if (pendingCount > 0)
    return { ok: false, reason: `仍有 ${pendingCount} 件未完成质量检测,不可发布` };

  const unqualifiedCount = welds.filter((w) => w.status === 'unqualified').length;
  if (unqualifiedCount > 0)
    return { ok: false, reason: `存在 ${unqualifiedCount} 件不合格,不可发布` };

  return { ok: true };
}

/**
 * 门禁规则三:已量产使用的程序不能被删除
 */
export function canDelete(programId: number): { ok: boolean; reason?: string } {
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(programId) as { status: ProgramStatus } | undefined;
  if (!program) return { ok: false, reason: '程序不存在' };
  if (program.status === 'in_production')
    return { ok: false, reason: '已量产使用的程序不可删除' };
  if (program.status === 'published')
    return { ok: false, reason: '已发布程序不可删除,如需删除请先撤回发布' };
  return { ok: true };
}

export { getProgramWelds, touch };
