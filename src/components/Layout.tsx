import { NavLink, Outlet } from 'react-router-dom';
import { useAppStore } from '@/store/useAppStore';
import { ROLES } from '@/lib/constants';
import type { Role } from '../../shared/types';
import {
  LayoutDashboard,
  GitBranch,
  FlaskConical,
  ClipboardCheck,
  Rocket,
  Flame,
} from 'lucide-react';
import Toast from './Toast';
import { cn } from '@/lib/utils';

const NAV = [
  { to: '/', label: '工作台', icon: LayoutDashboard },
  { to: '/programs', label: '程序版本', icon: GitBranch },
  { to: '/trials', label: '试焊批次', icon: FlaskConical },
  { to: '/quality', label: '质量结果', icon: ClipboardCheck },
  { to: '/releases', label: '发布记录', icon: Rocket },
];

export default function Layout() {
  const { role, setRole, operator } = useAppStore();
  return (
    <div className="flex h-full">
      <aside className="flex w-60 flex-shrink-0 flex-col border-r border-steel-800 bg-steel-950/70">
        <div className="flex items-center gap-2.5 border-b border-steel-800 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-spark/15 text-spark">
            <Flame size={20} />
          </div>
          <div>
            <div className="font-display text-base font-semibold tracking-wide text-zinc-100">
              焊程序变更
            </div>
            <div className="text-[10px] tracking-wider text-zinc-500">
              审批协同系统
            </div>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-spark/15 text-spark'
                      : 'text-zinc-400 hover:bg-steel-800/60 hover:text-zinc-200'
                  )
                }
              >
                <Icon size={17} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="border-t border-steel-800 p-3">
          <div className="mb-2 px-1 text-[10px] uppercase tracking-wider text-zinc-500">
            切换操作角色
          </div>
          <div className="grid grid-cols-3 gap-1">
            {ROLES.map((r) => {
              const active = r.key === role;
              return (
                <button
                  key={r.key}
                  onClick={() => setRole(r.key as Role)}
                  className={cn(
                    'rounded px-1.5 py-1.5 text-[11px] font-medium transition-colors',
                    active
                      ? 'bg-spark text-black'
                      : 'bg-steel-800 text-zinc-400 hover:text-zinc-200'
                  )}
                >
                  {r.short}
                </button>
              );
            })}
          </div>
          <div className="mt-2 truncate px-1 text-[11px] text-zinc-500">
            操作人:<span className="text-zinc-300">{operator}</span>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
