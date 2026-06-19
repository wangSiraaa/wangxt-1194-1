import type { ProgramStatus, Role, AppearanceGrade, WeldStatus, BatchStatus } from '../../shared/types';

export const ROLES: { key: Role; label: string; short: string; desc: string }[] = [
  { key: 'process_engineer', label: '工艺工程师', short: '工艺', desc: '提交程序版本 · 发布 · 量产标记' },
  { key: 'line_leader', label: '产线班长', short: '班长', desc: '安排试焊批次 · 登记试焊件' },
  { key: 'quality_engineer', label: '质量工程师', short: '质量', desc: '录入拉力与外观检测结果' },
];

export const ROLE_NAME: Record<Role, string> = {
  process_engineer: '李工',
  line_leader: '张班长',
  quality_engineer: '陈质检',
};

export interface StatusMeta {
  label: string;
  badge: string;
  dot: string;
  ring: string;
}

export const PROGRAM_STATUS: Record<ProgramStatus, StatusMeta> = {
  draft: { label: '草稿', badge: 'text-zinc-300 bg-zinc-700/50 border-zinc-600/60', dot: 'bg-zinc-500', ring: 'ring-zinc-500/30' },
  pending_trial: { label: '待试焊', badge: 'text-amber-300 bg-amber-500/10 border-amber-500/40', dot: 'bg-amber-400', ring: 'ring-amber-400/30' },
  trialing: { label: '试焊中', badge: 'text-sky-300 bg-sky-500/10 border-sky-500/40', dot: 'bg-sky-400', ring: 'ring-sky-400/30' },
  ready_to_publish: { label: '待发布', badge: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/40', dot: 'bg-emerald-400', ring: 'ring-emerald-400/30' },
  published: { label: '已发布', badge: 'text-green-300 bg-green-600/10 border-green-600/40', dot: 'bg-green-500', ring: 'ring-green-500/30' },
  locked: { label: '已锁定', badge: 'text-red-300 bg-red-600/10 border-red-600/40', dot: 'bg-red-500', ring: 'ring-red-500/30' },
  in_production: { label: '已量产', badge: 'text-orange-300 bg-orange-500/10 border-orange-500/40', dot: 'bg-orange-400', ring: 'ring-orange-400/30' },
};

export const BATCH_STATUS: Record<BatchStatus, string> = {
  pending: '待试焊',
  trialing: '试焊中',
  completed: '已完成',
};

export const WELD_STATUS: Record<WeldStatus, { label: string; cls: string }> = {
  pending: { label: '待检测', cls: 'text-zinc-400 bg-zinc-700/40' },
  qualified: { label: '合格', cls: 'text-green-300 bg-green-600/10' },
  unqualified: { label: '不合格', cls: 'text-red-300 bg-red-600/10' },
};

export const APPEARANCE_GRADE: Record<AppearanceGrade, { label: string; cls: string }> = {
  pass: { label: '合格', cls: 'text-green-300' },
  marginal: { label: '临界', cls: 'text-amber-300' },
  fail: { label: '不合格', cls: 'text-red-300' },
};

export const STATUS_FLOW: ProgramStatus[] = [
  'draft',
  'pending_trial',
  'trialing',
  'ready_to_publish',
  'published',
  'in_production',
];
