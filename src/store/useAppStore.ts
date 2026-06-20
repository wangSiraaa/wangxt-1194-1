import { create } from 'zustand';
import type { Role } from '../../shared/types';
import { ROLE_OPERATOR } from '../lib/constants';

interface AppState {
  role: Role;
  operatorName: string;
  toast: { id: number; type: 'success' | 'error' | 'info'; msg: string } | null;
  setRole: (role: Role) => void;
  showToast: (type: 'success' | 'error' | 'info', msg: string) => void;
  clearToast: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  role: 'process_engineer',
  operatorName: ROLE_OPERATOR['process_engineer'],
  toast: null,
  setRole: (role) => set({ role, operatorName: ROLE_OPERATOR[role] }),
  showToast: (type, msg) =>
    set({ toast: { id: Date.now(), type, msg } }),
  clearToast: () => set({ toast: null }),
}));
