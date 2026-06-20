// 焊接程序变更审批系统 - 公共类型定义

export type ProgramStatus =
  | 'draft'
  | 'pending_trial'
  | 'trialing'
  | 'ready_to_publish'
  | 'published'
  | 'locked'
  | 'in_production'
  | 'retired';

export type BatchStatus = 'pending' | 'trialing' | 'completed';
export type WeldStatus = 'pending' | 'qualified' | 'unqualified';
export type AppearanceGrade = 'pass' | 'marginal' | 'fail';
export type QualityResultValue = 'qualified' | 'unqualified';
export type RepairConclusion =
  | 'no_repair'
  | 'need_repair'
  | 'repaired_pass'
  | 'repaired_fail'
  | 'scrap';

export type ProductionOrderStatus = 'in_progress' | 'completed';
export type ProductionWeldStatus = 'pending' | 'completed';

export type Role = 'process_engineer' | 'line_leader' | 'quality_engineer';

export const ROLE_OPERATOR_MAP: Record<Role, string> = {
  process_engineer: '李工',
  line_leader: '张班长',
  quality_engineer: '陈质检',
};

export function resolveOperatorFromRole(roleKey: string | undefined): string {
  if (!roleKey) return '系统';
  const mapped = (ROLE_OPERATOR_MAP as Record<string, string>)[roleKey];
  if (mapped) return mapped;
  return roleKey;
}

export interface WeldingProgram {
  id: number;
  program_code: string;
  version: string;
  name: string;
  parameters: string;
  status: ProgramStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  retired_at: string | null;
  retired_by: string | null;
}

export interface TrialBatch {
  id: number;
  batch_no: string;
  program_id: number;
  weld_count: number;
  status: BatchStatus;
  arranged_by: string;
  created_at: string;
}

export interface TrialWeld {
  id: number;
  weld_no: string;
  batch_id: number;
  status: WeldStatus;
  created_at: string;
}

export interface QualityResult {
  id: number;
  weld_id: number;
  tensile_strength: number;
  appearance_grade: AppearanceGrade;
  result: QualityResultValue;
  repair_conclusion: RepairConclusion | null;
  inspected_by: string;
  remark: string;
  inspected_at: string;
}

export interface ReleaseRecord {
  id: number;
  program_id: number;
  released_by: string;
  in_production: number;
  released_at: string;
}

export interface ProgramProgress {
  total: number;
  inspected: number;
  qualified: number;
  unqualified: number;
  pending: number;
}

export interface ProgramDetail extends WeldingProgram {
  batches: TrialBatch[];
  welds: TrialWeld[];
  results: QualityResult[];
  releases: ReleaseRecord[];
  progress: ProgramProgress;
  impact_scope: ImpactScope | null;
  version_lineage: VersionLineageItem[];
}

export interface Workstation {
  id: number;
  code: string;
  name: string;
  line: string;
  program_code: string;
  created_at: string;
}

export interface ProductionOrder {
  id: number;
  order_no: string;
  product_name: string;
  workstation_id: number;
  program_code: string;
  quantity: number;
  status: ProductionOrderStatus;
  created_at: string;
}

export interface ProductionWeld {
  id: number;
  order_id: number;
  workstation_id: number;
  program_code: string;
  weld_no: string;
  status: ProductionWeldStatus;
  created_at: string;
}

export interface ImpactScope {
  workstations: Workstation[];
  orders: (ProductionOrder & { workstation?: Workstation })[];
  welds: (ProductionWeld & { order?: ProductionOrder; workstation?: Workstation })[];
  counts: { workstations: number; orders: number; welds: number };
}

export interface VersionLineageItem {
  id: number;
  version: string;
  status: ProgramStatus;
  created_at: string;
  retired_at: string | null;
  is_current: boolean;
}

export interface DashboardStats {
  draft: number;
  pending_trial: number;
  trialing: number;
  ready_to_publish: number;
  published: number;
  locked: number;
  in_production: number;
  retired: number;
  total: number;
}
