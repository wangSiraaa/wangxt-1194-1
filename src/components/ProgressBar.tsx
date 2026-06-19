import { cn } from '@/lib/utils';

export default function ProgressBar({
  qualified,
  total,
  unqualified,
}: {
  qualified: number;
  total: number;
  unqualified: number;
}) {
  const pct = total ? Math.round((qualified / total) * 100) : 0;
  const bad = unqualified > 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-zinc-400">
        <span>检测进度</span>
        <span className="font-mono text-zinc-300">
          {qualified}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-steel-700">
        <div
          className={cn('h-full rounded-full transition-all', bad ? 'bg-red-500' : 'bg-spark')}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
