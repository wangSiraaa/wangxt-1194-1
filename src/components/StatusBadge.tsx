import { PROGRAM_STATUS } from '@/lib/constants';
import type { ProgramStatus } from '../../shared/types';
import { cn } from '@/lib/utils';

export default function StatusBadge({
  status,
  size = 'md',
}: {
  status: ProgramStatus;
  size?: 'sm' | 'md';
}) {
  const meta = PROGRAM_STATUS[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded border px-2 py-0.5 text-xs font-medium',
        meta.badge,
        size === 'sm' && 'text-[10px] px-1.5 py-px'
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}
