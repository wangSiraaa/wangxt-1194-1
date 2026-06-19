import { useEffect, useState, useCallback } from 'react';
import { api, type ProgramListItem } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import Modal from '@/components/Modal';
import { WELD_STATUS, BATCH_STATUS } from '@/lib/constants';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Trials() {
  const { role, showToast } = useAppStore();
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [programs, setPrograms] = useState<ProgramListItem[]>([]);
  const [form, setForm] = useState({ program_id: '', weld_count: 3 });
  const [saving, setSaving] = useState(false);
  const isLeader = role === 'line_leader';

  const load = useCallback(() => {
    setLoading(true);
    api
      .getBatches()
      .then(setBatches)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(load, [load]);

  const openCreate = async () => {
    try {
      const all = await api.getPrograms();
      setPrograms(
        all.filter((p) =>
          ['pending_trial', 'trialing', 'ready_to_publish'].includes(p.status)
        )
      );
      setForm({ program_id: '', weld_count: 3 });
      setOpen(true);
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const save = async () => {
    if (!form.program_id) {
      showToast('error', '请选择程序版本');
      return;
    }
    setSaving(true);
    try {
      await api.createBatch({
        program_id: Number(form.program_id),
        weld_count: Number(form.weld_count),
      });
      showToast('success', '已安排试焊批次');
      setOpen(false);
      load();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100">
            试焊批次
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            班长为待试焊程序安排批次并登记试焊件,质检随后录入结果
          </p>
        </div>
        {isLeader && (
          <button onClick={openCreate} className="btn btn-spark">
            <Plus size={16} /> 安排试焊批次
          </button>
        )}
      </header>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-steel-700 bg-steel-900/50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">批次号</th>
              <th className="px-4 py-3 font-medium">程序编号</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">件数</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="px-4 py-3 font-medium">安排人</th>
              <th className="px-4 py-3 font-medium">试焊件明细</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-800">
            {batches.map((b) => {
              const ws = BATCH_STATUS[b.status as keyof typeof BATCH_STATUS] || b.status;
              return (
                <tr key={b.id} className="align-top transition-colors hover:bg-steel-800/30">
                  <td className="px-4 py-3 font-mono text-zinc-200">{b.batch_no}</td>
                  <td className="px-4 py-3 font-mono text-spark-300">{b.program_code || '—'}</td>
                  <td className="px-4 py-3 font-mono text-zinc-300">{b.version || '—'}</td>
                  <td className="px-4 py-3 text-zinc-300">{b.weld_count}</td>
                  <td className="px-4 py-3">
                    <span className="rounded border border-steel-600 px-2 py-0.5 text-xs text-zinc-300">
                      {ws}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{b.arranged_by}</td>
                  <td className="px-4 py-3">
                    <div className="flex max-w-md flex-wrap gap-1">
                      {(b.welds || []).map((w: any) => {
                        const m = WELD_STATUS[w.status as keyof typeof WELD_STATUS];
                        return (
                          <span
                            key={w.id}
                            title={m?.label}
                            className={cn(
                              'rounded px-1.5 py-0.5 font-mono text-[10px]',
                              m?.cls
                            )}
                          >
                            {w.weld_no}
                          </span>
                        );
                      })}
                      {!b.welds?.length && (
                        <span className="text-xs text-zinc-600">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {!batches.length && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-zinc-500">
                  暂无试焊批次
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="安排试焊批次"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>
              取消
            </button>
            <button className="btn btn-spark" onClick={save} disabled={saving}>
              确认安排
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">选择程序版本</label>
            <select
              className="input"
              value={form.program_id}
              onChange={(e) => setForm({ ...form, program_id: e.target.value })}
            >
              <option value="">— 请选择 —</option>
              {programs.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.program_code} {p.version} · {p.name}
                </option>
              ))}
            </select>
            {programs.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-400/80">
                当前无可安排试焊的程序(需先提交至待试焊)
              </p>
            )}
          </div>
          <div>
            <label className="label">试焊件数量</label>
            <input
              type="number"
              min={1}
              max={20}
              className="input"
              value={form.weld_count}
              onChange={(e) => setForm({ ...form, weld_count: Number(e.target.value) })}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              系统将自动生成对应数量的试焊件编号
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
