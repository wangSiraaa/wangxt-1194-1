// 焊接程序变更审批系统 - 公共类型定义

export type ProgramStatus =
  | 'draft'
  | 'pending_trial'
  | 'trialing'
  | 'ready_to_publish'
  | 'published'
  | 'locked'
  | 'in_production';

export type BatchStatus = 'pending' | 'trialing' | 'completed';
export type WeldStatus = 'pending' | 'qualified' | 'unqualified';
export type AppearanceGrade = 'pass' | 'marginal' | 'fail';
export type QualityResultValue = 'qualified' | 'unqualified';

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
}

export interface DashboardStats {
  draft: number;
  pending_trial: number;
  trialing: number;
  ready_to_publish: number;
  published: number;
  locked: number;
  in_production: number;
  total: number;
}
