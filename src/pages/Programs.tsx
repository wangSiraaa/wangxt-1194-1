import { useEffect, useState, useCallback } from 'react';
import { api, type ProgramListItem } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import StatusBadge from '@/components/StatusBadge';
import ProgressBar from '@/components/ProgressBar';
import Modal from '@/components/Modal';
import { APPEARANCE_GRADE, WELD_STATUS } from '@/lib/constants';
import type { ProgramStatus } from '../../shared/types';
import {
  Plus,
  Eye,
  Pencil,
  Upload,
  Rocket,
  Trash2,
  Factory,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgramDetail {
  id: number;
  program_code: string;
  version: string;
  name: string;
  parameters: string;
  status: ProgramStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  batches: any[];
  welds: any[];
  results: any[];
  releases: any[];
  progress: { total: number; inspected: number; qualified: number; unqualified: number; pending: number };
}

const EMPTY_FORM = { program_code: '', version: '', name: '', parameters: '' };

function parseParams(s: string): Record<string, any> | null {
  if (!s) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export default function Programs() {
  const { role, showToast } = useAppStore();
  const [list, setList] = useState<ProgramListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<ProgramDetail | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const isProc = role === 'process_engineer';

  const load = useCallback(() => {
    setLoading(true);
    api
      .getPrograms()
      .then(setList)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(load, [load]);

  const openDetail = async (id: number) => {
    try {
      const d = await api.getProgram(id);
      setDetail(d);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const refreshDetail = async () => {
    if (detail) await openDetail(detail.id);
  };

  const openCreate = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  };
  const openEdit = (p: ProgramListItem) => {
    setEditId(p.id);
    setForm({
      program_code: p.program_code,
      version: p.version,
      name: p.name,
      parameters: p.parameters || '',
    });
    setFormOpen(true);
  };

  const save = async (submit: boolean) => {
    if (!form.program_code || !form.version || !form.name) {
      showToast('error', '请填写程序编号、版本号与名称');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        await api.updateProgram(editId, form);
        showToast('success', '已保存修改');
      } else {
        await api.createProgram({ ...form, submit });
        showToast('success', submit ? '已创建并提交待试焊' : '已保存草稿');
      }
      setFormOpen(false);
      load();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const act = async (fn: () => Promise<any>, ok: string, after?: () => void) => {
    try {
      await fn();
      showToast('success', ok);
      load();
      if (after) after();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const del = async (p: ProgramListItem) => {
    if (!confirm(`确认删除程序 ${p.program_code} ${p.version}?此操作将级联清除其试焊与质量数据。`)) return;
    await act(() => api.deleteProgram(p.id), '已删除', () => detail?.id === p.id && setDetail(null));
  };

  const btn = 'inline-flex h-8 w-8 items-center justify-center rounded-md border border-transparent text-zinc-400 transition-colors hover:border-steel-600 hover:bg-steel-800 hover:text-zinc-100';

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100">
            程序版本
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            工艺工程师提交版本 · 班长试焊 · 质检确认 · 工艺发布与量产
          </p>
        </div>
        {isProc && (
          <button onClick={openCreate} className="btn btn-spark">
            <Plus size={16} /> 新建程序版本
          </button>
        )}
      </header>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-steel-700 bg-steel-900/50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">程序编号</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">名称</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">试焊进度</th>
              <th className="px-4 py-3 font-medium">创建人</th>
              <th className="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-800">
            {list.map((p) => (
              <tr key={p.id} className="transition-colors hover:bg-steel-800/30">
                <td className="px-4 py-3 font-mono text-spark-300">{p.program_code}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{p.version}</td>
                <td className="px-4 py-3 text-zinc-200">{p.name}</td>
                <td className="px-4 py-3"><StatusBadge status={p.status} size="sm" /></td>
                <td className="px-4 py-3 w-44">
                  {p.progress.total ? (
                    <ProgressBar
                      qualified={p.progress.qualified}
                      total={p.progress.total}
                      unqualified={p.progress.unqualified}
                    />
                  ) : (
                    <span className="text-xs text-zinc-600">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-zinc-400">{p.created_by}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button title="查看详情" className={btn} onClick={() => openDetail(p.id)}>
                      <Eye size={15} />
                    </button>
                    {isProc && p.status === 'draft' && (
                      <>
                        <button title="编辑" className={btn} onClick={() => openEdit(p)}>
                          <Pencil size={15} />
                        </button>
                        <button title="提交待试焊" className={btn} onClick={() => act(() => api.submitProgram(p.id), '已提交待试焊')}>
                          <Upload size={15} />
                        </button>
                        <button title="删除" className={cn(btn, 'hover:border-red-600/50 hover:text-red-300')} onClick={() => del(p)}>
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}
                    {isProc && p.status === 'ready_to_publish' && (
                      <button title="发布" className={cn(btn, 'hover:border-emerald-500/50 hover:text-emerald-300')} onClick={() => act(() => api.publishProgram(p.id), '已发布', refreshDetail)}>
                        <Rocket size={15} />
                      </button>
                    )}
                    {isProc && p.status === 'published' && (
                      <button title="标记量产" className={cn(btn, 'hover:border-orange-500/50 hover:text-orange-300')} onClick={() => act(() => api.markProduction(p.id), '已标记量产', refreshDetail)}>
                        <Factory size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">暂无程序版本</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 详情弹窗 */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="程序版本详情" size="xl">
        {detail && <DetailBody detail={detail} />}
      </Modal>

      {/* 新建/编辑表单 */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editId ? '编辑程序版本' : '新建程序版本'}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setFormOpen(false)} disabled={saving}>取消</button>
            {!editId && (
              <button className="btn btn-ghost" onClick={() => save(false)} disabled={saving}>存为草稿</button>
            )}
            <button className="btn btn-spark" onClick={() => save(true)} disabled={saving}>
              {editId ? '保存' : '保存并提交'}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">程序编号</label>
              <input className="input" placeholder="如 WLD-A01" value={form.program_code} onChange={(e) => setForm({ ...form, program_code: e.target.value })} />
            </div>
            <div>
              <label className="label">版本号</label>
              <input className="input" placeholder="如 v1.0" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">程序名称</label>
            <input className="input" placeholder="如 车架主焊缝焊接程序" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">焊接参数(JSON)</label>
            <textarea
              className="input h-28 font-mono text-xs"
              placeholder={'{\n  "电流": 110,\n  "时间": 10,\n  "压力": 2.2\n}'}
              value={form.parameters}
              onChange={(e) => setForm({ ...form, parameters: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DetailBody({ detail }: { detail: ProgramDetail }) {
  const params = parseParams(detail.parameters);
  const resultByWeld = new Map(detail.results.map((r) => [r.weld_id, r]));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="font-mono text-lg text-spark-300">{detail.program_code}</span>
        <span className="font-mono text-zinc-300">{detail.version}</span>
        <StatusBadge status={detail.status} />
        <span className="text-sm text-zinc-400">{detail.name}</span>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-lg border border-steel-700/50 bg-steel-900/30 p-4 text-sm md:grid-cols-4">
        <Info label="创建人" value={detail.created_by} />
        <Info label="创建时间" value={detail.created_at} mono />
        <Info label="更新时间" value={detail.updated_at} mono />
        <Info label="试焊件" value={`${detail.progress.total} 件`} />
      </div>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">焊接参数</h4>
        {params ? (
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {Object.entries(params).map(([k, v]) => (
              <div key={k} className="rounded border border-steel-700/50 bg-steel-900/40 px-3 py-2">
                <div className="text-[10px] uppercase tracking-wide text-zinc-500">{k}</div>
                <div className="font-mono text-sm text-zinc-200">{String(v)}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="font-mono text-xs text-zinc-500">{detail.parameters || '—'}</div>
        )}
      </div>

      {detail.progress.total > 0 && (
        <div className="max-w-md">
          <ProgressBar
            qualified={detail.progress.qualified}
            total={detail.progress.total}
            unqualified={detail.progress.unqualified}
          />
        </div>
      )}

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">试焊批次与质量结果</h4>
        {detail.batches.length ? (
          <div className="space-y-3">
            {detail.batches.map((b) => {
              const welds = detail.welds.filter((w) => w.batch_id === b.id);
              return (
                <div key={b.id} className="rounded-lg border border-steel-700/50 bg-steel-900/30">
                  <div className="flex flex-wrap items-center gap-3 border-b border-steel-800 px-3 py-2 text-xs">
                    <span className="font-mono text-zinc-200">{b.batch_no}</span>
                    <span className="text-zinc-500">{b.weld_count} 件</span>
                    <span className="text-zinc-500">安排人 {b.arranged_by}</span>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-left text-zinc-500">
                      <tr>
                        <th className="px-3 py-1.5 font-medium">试焊件</th>
                        <th className="px-3 py-1.5 font-medium">状态</th>
                        <th className="px-3 py-1.5 font-medium">拉力(N)</th>
                        <th className="px-3 py-1.5 font-medium">外观</th>
                        <th className="px-3 py-1.5 font-medium">检测人</th>
                      </tr>
                    </thead>
                    <tbody>
                      {welds.map((w) => {
                        const r = resultByWeld.get(w.id);
                        const ws = WELD_STATUS[w.status as keyof typeof WELD_STATUS];
                        const ap = r?.appearance_grade ? APPEARANCE_GRADE[r.appearance_grade as keyof typeof APPEARANCE_GRADE] : null;
                        return (
                          <tr key={w.id} className="border-t border-steel-800/60">
                            <td className="px-3 py-1.5 font-mono text-zinc-300">{w.weld_no}</td>
                            <td className="px-3 py-1.5">
                              <span className={cn('rounded px-1.5 py-0.5 text-[10px]', ws?.cls)}>{ws?.label}</span>
                            </td>
                            <td className="px-3 py-1.5 font-mono text-zinc-300">{r?.tensile_strength ?? '—'}</td>
                            <td className={cn('px-3 py-1.5', ap?.cls)}>{ap?.label ?? '—'}</td>
                            <td className="px-3 py-1.5 text-zinc-500">{r?.inspected_by ?? '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-steel-700 px-4 py-6 text-center text-xs text-zinc-500">
            尚未安排试焊批次
          </div>
        )}
      </div>

      {detail.releases.length > 0 && (
        <div>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-500">发布记录</h4>
          <div className="space-y-1.5">
            {detail.releases.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded border border-steel-700/50 bg-steel-900/30 px-3 py-2 text-xs">
                <span className="font-mono text-zinc-400">{r.released_at}</span>
                <span className="text-zinc-300">由 {r.released_by} 发布</span>
                {r.in_production ? (
                  <span className="rounded border border-orange-500/40 bg-orange-500/10 px-1.5 py-0.5 text-orange-300">已量产</span>
                ) : (
                  <span className="text-zinc-500">仅发布</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Info({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</div>
      <div className={cn('mt-0.5 text-zinc-200', mono && 'font-mono text-xs')}>{value}</div>
    </div>
  );
}
