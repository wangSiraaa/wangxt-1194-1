import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import Modal from '@/components/Modal';
import { APPEARANCE_GRADE } from '@/lib/constants';
import { ClipboardCheck, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PendingWeld {
  id: number;
  weld_no: string;
  batch_id: number;
  program_id: number;
  batch_no: string;
  program_code: string;
  version: string;
  name: string;
}

const EMPTY = {
  weld_id: 0,
  tensile_strength: '',
  appearance_grade: 'pass',
  result: 'qualified',
  remark: '',
};

export default function Quality() {
  const { role, showToast } = useAppStore();
  const [list, setList] = useState<PendingWeld[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const isQa = role === 'quality_engineer';

  const load = useCallback(() => {
    setLoading(true);
    api
      .getPendingWelds()
      .then(setList)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  }, [showToast]);

  useEffect(load, [load]);

  const openForm = (w: PendingWeld) => {
    setForm({ ...EMPTY, weld_id: w.id, tensile_strength: '' });
    setOpen(true);
  };

  const save = async () => {
    if (!form.tensile_strength) {
      showToast('error', '请输入拉力测试值');
      return;
    }
    setSaving(true);
    try {
      const r = await api.submitQuality({
        weld_id: form.weld_id,
        tensile_strength: Number(form.tensile_strength),
        appearance_grade: form.appearance_grade,
        result: form.result,
        remark: form.remark,
      });
      showToast(
        'success',
        form.result === 'qualified'
          ? '已录入合格结果'
          : '已录入不合格结果,程序版本将被锁定'
      );
      setOpen(false);
      load();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  const ts = Number(form.tensile_strength);
  const tsWarn = ts > 0 && ts < 4000;

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100">
          质量结果
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          质量工程师录入拉力与外观检测结果,不合格将自动锁定该程序版本
        </p>
      </header>

      <div className="panel mb-4 flex items-center gap-3 border-l-2 border-l-spark/60 px-4 py-3 text-sm">
        <ClipboardCheck size={16} className="text-spark" />
        <span className="text-zinc-300">待检测试焊件</span>
        <span className="stat-num text-lg text-zinc-100">{list.length}</span>
        <span className="text-zinc-500">个</span>
      </div>

      {list.length ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {list.map((w) => (
            <div key={w.id} className="panel p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-mono text-sm text-spark-300">{w.weld_no}</div>
                  <div className="mt-1 text-xs text-zinc-500">批次 {w.batch_no}</div>
                </div>
                <FlaskConical size={18} className="text-zinc-600" />
              </div>
              <div className="mt-3 border-t border-steel-800 pt-3">
                <div className="font-mono text-sm text-zinc-200">
                  {w.program_code} <span className="text-zinc-400">{w.version}</span>
                </div>
                <div className="mt-0.5 text-xs text-zinc-500">{w.name}</div>
              </div>
              {isQa ? (
                <button onClick={() => openForm(w)} className="btn btn-spark mt-3 w-full">
                  录入检测结果
                </button>
              ) : (
                <p className="mt-3 text-center text-xs text-zinc-600">切换为质量工程师角色录入</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="panel flex flex-col items-center gap-2 px-4 py-16 text-center">
          <ClipboardCheck size={32} className="text-zinc-700" />
          <p className="text-sm text-zinc-500">
            {loading ? '加载中...' : '暂无待检测试焊件'}
          </p>
          {!loading && (
            <p className="text-xs text-zinc-600">所有试焊件均已检测完毕</p>
          )}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="录入质量检测结果"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setOpen(false)} disabled={saving}>取消</button>
            <button className="btn btn-spark" onClick={save} disabled={saving}>提交结果</button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="label">拉力测试值(N)</label>
            <input
              type="number"
              className={cn('input', tsWarn && 'border-amber-500/60')}
              placeholder="如 5800"
              value={form.tensile_strength}
              onChange={(e) => setForm({ ...form, tensile_strength: e.target.value })}
            />
            {tsWarn && (
              <p className="mt-1.5 text-xs text-amber-400/80">
                提示:该值低于 4000N,通常判定为不合格
              </p>
            )}
          </div>
          <div>
            <label className="label">外观评级</label>
            <select
              className="input"
              value={form.appearance_grade}
              onChange={(e) => setForm({ ...form, appearance_grade: e.target.value })}
            >
              {(['pass', 'marginal', 'fail'] as const).map((g) => (
                <option key={g} value={g}>
                  {APPEARANCE_GRADE[g].label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">检测结论</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: 'qualified', label: '合格' },
                { v: 'unqualified', label: '不合格' },
              ] as const).map((o) => (
                <button
                  key={o.v}
                  onClick={() => setForm({ ...form, result: o.v })}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                    form.result === o.v
                      ? o.v === 'qualified'
                        ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300'
                        : 'border-red-500/60 bg-red-500/15 text-red-300'
                      : 'border-steel-600 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {form.result === 'unqualified' && (
              <p className="mt-1.5 text-xs text-red-400/80">
                不合格将触发质量门禁,该程序版本会被自动锁定,无法发布
              </p>
            )}
          </div>
          <div>
            <label className="label">备注</label>
            <textarea
              className="input h-20 text-xs"
              placeholder="检测说明(选填)"
              value={form.remark}
              onChange={(e) => setForm({ ...form, remark: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
