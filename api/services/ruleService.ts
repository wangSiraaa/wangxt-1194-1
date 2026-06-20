import db from '../db.js';
import type {
  ProgramStatus,
  ImpactScope,
  Workstation,
  ProductionOrder,
  ProductionWeld,
  VersionLineageItem,
} from '../../shared/types.js';

interface WeldRow {
  id: number;
  weld_no: string;
  batch_id: number;
  status: string;
  created_at: string;
}

function getProgramWelds(programId: number): WeldRow[] {
  return db
    .prepare(
      `SELECT tw.id, tw.weld_no, tw.batch_id, tw.status, tw.created_at
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
 * - 已发布/量产/退役状态保持(除非出现不合格)
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

  // 已发布、量产或退役状态保持不变
  if (
    program.status === 'published' ||
    program.status === 'in_production' ||
    program.status === 'retired'
  ) {
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
 * 门禁规则三:已量产/已退役使用的程序不能被删除,只能退役或回滚
 */
export function canDelete(programId: number): { ok: boolean; reason?: string } {
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(programId) as { status: ProgramStatus } | undefined;
  if (!program) return { ok: false, reason: '程序不存在' };
  if (program.status === 'in_production')
    return { ok: false, reason: '已量产使用的程序不可删除,请改为退役' };
  if (program.status === 'retired')
    return { ok: false, reason: '已退役的程序不可删除,需保留用于追溯' };
  if (program.status === 'published')
    return { ok: false, reason: '已发布程序不可删除,如需删除请先撤回发布' };
  return { ok: true };
}

/**
 * 门禁规则:仅已发布或已量产的程序可退役
 */
export function canRetire(programId: number): { ok: boolean; reason?: string } {
  const program = db
    .prepare('SELECT status FROM welding_programs WHERE id = ?')
    .get(programId) as { status: ProgramStatus } | undefined;
  if (!program) return { ok: false, reason: '程序不存在' };
  if (program.status !== 'published' && program.status !== 'in_production')
    return { ok: false, reason: '仅已发布或已量产的程序可退役' };
  return { ok: true };
}

/**
 * 门禁规则:仅退役或已发布的程序可被回滚(重新激活为量产版本)
 * 且同 program_code 下必须存在一个当前 in_production 版本(否则无需回滚)
 */
export function canRollback(programId: number): { ok: boolean; reason?: string } {
  const program = db
    .prepare('SELECT id, program_code, status FROM welding_programs WHERE id = ?')
    .get(programId) as { id: number; program_code: string; status: ProgramStatus } | undefined;
  if (!program) return { ok: false, reason: '程序不存在' };
  if (program.status !== 'retired' && program.status !== 'published')
    return { ok: false, reason: '仅退役或已发布的程序可回滚' };
  const current = db
    .prepare('SELECT id FROM welding_programs WHERE program_code=? AND status=?')
    .get(program.program_code, 'in_production') as { id: number } | undefined;
  if (!current)
    return { ok: false, reason: '当前无在产版本,无需回滚,请直接标记量产' };
  if (current.id === program.id)
    return { ok: false, reason: '该版本即为当前在产版本,无需回滚' };
  return { ok: true };
}

/**
 * 执行退役:将程序状态置为 retired,记录退役人与时间
 */
export function retireProgram(programId: number, op: string): void {
  db.prepare(
    "UPDATE welding_programs SET status='retired', retired_at=datetime('now','localtime'), retired_by=?, updated_at=datetime('now','localtime') WHERE id=?"
  ).run(op, programId);
  if (db.prepare('SELECT program_id FROM release_records WHERE program_id=?').get(programId)) {
    db.prepare('UPDATE release_records SET in_production=0 WHERE program_id=?').run(programId);
  }
}

/**
 * 执行回滚:将当前在产版本退役,将目标版本重新激活为在产
 */
export function rollbackProgram(programId: number, op: string): { program_code: string } {
  const target = db
    .prepare('SELECT program_code FROM welding_programs WHERE id=?')
    .get(programId) as { program_code: string };
  const current = db
    .prepare('SELECT id FROM welding_programs WHERE program_code=? AND status=?')
    .get(target.program_code, 'in_production') as { id: number } | undefined;
  db.transaction(() => {
    if (current) {
      db.prepare(
        "UPDATE welding_programs SET status='retired', retired_at=datetime('now','localtime'), retired_by=?, updated_at=datetime('now','localtime') WHERE id=?"
      ).run(op, current.id);
      db.prepare('UPDATE release_records SET in_production=0 WHERE program_id=?').run(current.id);
    }
    db.prepare(
      "UPDATE welding_programs SET status='in_production', updated_at=datetime('now','localtime') WHERE id=?"
    ).run(programId);
    db.prepare('UPDATE release_records SET in_production=1 WHERE program_id=?').run(programId);
    if (!db.prepare('SELECT program_id FROM release_records WHERE program_id=?').get(programId)) {
      db.prepare(
        'INSERT INTO release_records (program_id, released_by, in_production) VALUES (?,?,1)'
      ).run(programId, op);
    }
  })();
  return { program_code: target.program_code };
}

/**
 * 自动退役:标记量产时,将同 program_code 的旧在产版本退役
 */
export function autoRetirePreviousProduction(programCode: string, excludeId: number, op: string): void {
  const prev = db
    .prepare('SELECT id FROM welding_programs WHERE program_code=? AND status=? AND id<>?')
    .get(programCode, 'in_production', excludeId) as { id: number } | undefined;
  if (prev) {
    retireProgram(prev.id, op);
  }
}

/**
 * 查询量产影响范围:按 program_code 关联的工位、订单、焊缝
 */
export function getImpactScope(programCode: string): ImpactScope {
  const workstations = db
    .prepare('SELECT * FROM workstations WHERE program_code=? ORDER BY id')
    .all(programCode) as Workstation[];
  const orders = (
    db
      .prepare('SELECT * FROM production_orders WHERE program_code=? ORDER BY id DESC')
      .all(programCode) as ProductionOrder[]
  ).map((o) => ({
    ...o,
    workstation: workstations.find((w) => w.id === o.workstation_id),
  }));
  const welds = (
    db
      .prepare('SELECT * FROM production_welds WHERE program_code=? ORDER BY id')
      .all(programCode) as ProductionWeld[]
  ).map((w) => ({
    ...w,
    order: orders.find((o) => o.id === w.order_id),
    workstation: workstations.find((ws) => ws.id === w.workstation_id),
  }));
  return {
    workstations,
    orders,
    welds,
    counts: { workstations: workstations.length, orders: orders.length, welds: welds.length },
  };
}

/**
 * 查询版本血缘:同一 program_code 下所有版本的演进记录
 */
export function getVersionLineage(programId: number): VersionLineageItem[] {
  const program = db
    .prepare('SELECT program_code FROM welding_programs WHERE id=?')
    .get(programId) as { program_code: string } | undefined;
  if (!program) return [];
  const rows = db
    .prepare(
      'SELECT id, version, status, created_at, retired_at FROM welding_programs WHERE program_code=? ORDER BY id'
    )
    .all(program.program_code) as (VersionLineageItem & { is_current?: number })[];
  return rows.map((r) => ({
    id: r.id,
    version: r.version,
    status: r.status,
    created_at: r.created_at,
    retired_at: r.retired_at,
    is_current: r.status === 'in_production',
  }));
}

export { getProgramWelds, touch };
