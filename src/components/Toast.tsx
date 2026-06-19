import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CheckCircle2, XCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Toast() {
  const { toast, clearToast } = useAppStore();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(clearToast, 2800);
    return () => clearTimeout(t);
  }, [toast, clearToast]);
  if (!toast) return null;
  const Icon =
    toast.type === 'success' ? CheckCircle2 : toast.type === 'error' ? XCircle : Info;
  const color =
    toast.type === 'success'
      ? 'text-green-400'
      : toast.type === 'error'
        ? 'text-red-400'
        : 'text-sky-400';
  return (
    <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2">
      <div className="panel flex items-center gap-2.5 px-4 py-2.5">
        <Icon size={18} className={cn(color)} />
        <span className="text-sm text-zinc-200">{toast.msg}</span>
      </div>
    </div>
  );
}
