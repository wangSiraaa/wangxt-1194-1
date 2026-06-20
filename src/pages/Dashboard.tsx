import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '@/lib/api';
import { PROGRAM_STATUS, STATUS_FLOW } from '@/lib/constants';
import type { ProgramStatus } from '../../shared/types';
import { useAppStore } from '@/store/useAppStore';
import { FileStack, ClipboardCheck, Rocket, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
  stats: Record<string, number> & { total: number };
  todos: { pendingWelds: number; pendingTrialPrograms: number; readyToPublish: number };
}

const TODO_META = [
  {
    key: 'pendingTrialPrograms',
    title: '待安排试焊',
    desc: '个程序等待班长安排批次',
    icon: FileStack,
    color: 'text-amber-400',
    ring: 'border-amber-500/40 bg-amber-500/5',
    to: '/trials',
  },
  {
    key: 'pendingWelds',
    title: '待质量检测',
    desc: '个试焊件等待质检录入',
    icon: ClipboardCheck,
    color: 'text-sky-400',
    ring: 'border-sky-500/40 bg-sky-500/5',
    to: '/quality',
  },
  {
    key: 'readyToPublish',
    title: '待发布程序',
    desc: '个程序已通过检测可发布',
    icon: Rocket,
    color: 'text-emerald-400',
    ring: 'border-emerald-500/40 bg-emerald-500/5',
    to: '/programs',
  },
] as const;

export default function Dashboard() {
  const [data, setData] = useState<Stats | null>(null);
  const nav = useNavigate();
  const { showToast } = useAppStore();

  useEffect(() => {
    api
      .getStats()
      .then(setData)
      .catch((e) => showToast('error', e.message));
  }, []);

  if (!data) {
    return (
      <div className="p-8 text-sm text-zinc-500">正在加载工作台数据...</div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-semibold tracking-wide text-zinc-100">
          工作台
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          焊接程序变更审批协同概览 · 当前共 {data.stats.total} 个程序版本
        </p>
      </header>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        {TODO_META.map((t) => {
          const Icon = t.icon;
          const v = data.todos[t.key as keyof typeof data.todos];
          return (
            <button
              key={t.key}
              onClick={() => nav(t.to)}
              className={cn(
                'panel group flex items-center gap-4 p-5 text-left transition-all hover:border-spark/40',
                t.ring
              )}
            >
              <div className={cn('flex h-11 w-11 items-center justify-center rounded-lg bg-steel-800/60', t.color)}>
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <div className="text-xs uppercase tracking-wider text-zinc-500">
                  {t.title}
                </div>
                <div className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="stat-num text-3xl text-zinc-100">{v}</span>
                  <span className="text-xs text-zinc-500">{t.desc}</span>
                </div>
              </div>
              <ArrowRight
                size={18}
                className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-spark"
              />
            </button>
          );
        })}
      </div>

      <div className="panel p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium tracking-wide text-zinc-200">
            程序状态分布
          </h2>
          <span className="text-xs text-zinc-500">
            共 {data.stats.total} 个
          </span>
        </div>
        <div className="flex flex-wrap items-stretch gap-3">
          {STATUS_FLOW.concat(['locked']).map((s, idx) => {
            const meta = PROGRAM_STATUS[s as ProgramStatus];
            const c = data.stats[s] || 0;
            return (
              <div key={s} className="flex items-center">
                <div className="min-w-[120px] rounded-lg border border-steel-700/50 bg-steel-900/40 p-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
                    <span className="text-[11px] text-zinc-400">{meta.label}</span>
                  </div>
                  <div className="stat-num mt-1.5 text-3xl text-zinc-100">{c}</div>
                </div>
                {idx < STATUS_FLOW.length && (
                  <div className="px-1 text-zinc-700">›</div>
                )}
              </div>
            );
          })}
        </div>
        <p className="mt-4 border-t border-steel-800 pt-3 text-xs leading-relaxed text-zinc-500">
          流转:草稿 → 待试焊 → 试焊中 → 待发布 → 已发布 → 已量产 → 退役。
          <span className="text-red-400/80">
            质量不合格将锁定该版本,已量产或退役程序不可删除,仅可退役或回滚。
          </span>
        </p>
      </div>
    </div>
  );
}
