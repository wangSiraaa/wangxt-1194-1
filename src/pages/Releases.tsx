import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';
import { Rocket } from 'lucide-react';

export default function Releases() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useAppStore();

  const load = () => {
    setLoading(true);
    api
      .getReleases()
      .then(setRows)
      .catch((e) => showToast('error', e.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100">
          发布记录
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          已发布与量产程序的历史留痕,记录每一次程序上线与量产标记
        </p>
      </header>

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-steel-700 bg-steel-900/50 text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-medium">程序编号</th>
              <th className="px-4 py-3 font-medium">版本</th>
              <th className="px-4 py-3 font-medium">程序名称</th>
              <th className="px-4 py-3 font-medium">发布人</th>
              <th className="px-4 py-3 font-medium">发布时间</th>
              <th className="px-4 py-3 font-medium">量产状态</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-steel-800">
            {rows.map((r) => (
              <tr key={r.id} className="transition-colors hover:bg-steel-800/30">
                <td className="px-4 py-3 font-mono text-spark-300">
                  {r.program_code}
                </td>
                <td className="px-4 py-3 font-mono text-zinc-300">{r.version}</td>
                <td className="px-4 py-3 text-zinc-200">{r.name}</td>
                <td className="px-4 py-3 text-zinc-400">{r.released_by}</td>
                <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                  {r.released_at}
                </td>
                <td className="px-4 py-3">
                  {r.in_production ? (
                    <span className="inline-flex items-center gap-1 rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-xs text-orange-300">
                      <Rocket size={11} /> 已量产
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">仅发布</span>
                  )}
                </td>
              </tr>
            ))}
            {!rows.length && !loading && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-zinc-500"
                >
                  暂无发布记录
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
