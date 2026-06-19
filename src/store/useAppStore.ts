import { create } from 'zustand';
import type { Role } from '../../shared/types';
import { ROLE_NAME } from '../lib/constants';

interface AppState {
  role: Role;
  operator: string;
  toast: { id: number; type: 'success' | 'error' | 'info'; msg: string } | null;
  setRole: (role: Role) => void;
  showToast: (type: 'success' | 'error' | 'info', msg: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'process_engineer',
  operator: ROLE_NAME['process_engineer'],
  toast: null,
  setRole: (role) => set({ role, operator: ROLE_NAME[role] }),
  showToast: (type, msg) =>
    set({ toast: { id: Date.now(), type, msg } }),
  clearToast: () => set({ toast: null }),
}));
