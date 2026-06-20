import { useAppStore } from '../store/useAppStore';
import type { ProgramStatus, ProgramProgress } from '../../shared/types';

const BASE = '/api';

function authHeaders(): Record<string, string> {
  const { role, operatorName } = useAppStore.getState();
  return { 'x-operator': role, 'x-operator-name': encodeURIComponent(operatorName) };
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(BASE + url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as any).error || '请求失败');
  }
  return data as T;
}

export interface ProgramListItem {
  id: number;
  program_code: string;
  version: string;
  name: string;
  parameters: string;
  status: ProgramStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
  progress: ProgramProgress;
}

export const api = {
  getStats: () => request('/dashboard/stats').then((r) => (r as any).data),
  getPrograms: () => request('/programs').then((r) => (r as any).data) as Promise<ProgramListItem[]>,
  getProgram: (id: number) => request(`/programs/${id}`).then((r) => (r as any).data),
  createProgram: (body: any) =>
    request('/programs', { method: 'POST', body: JSON.stringify(body) }).then((r) => (r as any).data),
  updateProgram: (id: number, body: any) =>
    request(`/programs/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  submitProgram: (id: number) => request(`/programs/${id}/submit`, { method: 'POST' }),
  deleteProgram: (id: number) => request(`/programs/${id}`, { method: 'DELETE' }),
  publishProgram: (id: number) => request(`/programs/${id}/publish`, { method: 'POST' }),
  markProduction: (id: number) => request(`/programs/${id}/mark-production`, { method: 'POST' }),
  getBatches: (programId?: number) =>
    request('/trial-batches' + (programId ? `?program_id=${programId}` : '')).then((r) => (r as any).data),
  createBatch: (body: any) =>
    request('/trial-batches', { method: 'POST', body: JSON.stringify(body) }),
  getPendingWelds: () => request('/quality-results/pending').then((r) => (r as any).data),
  submitQuality: (body: any) =>
    request('/quality-results', { method: 'POST', body: JSON.stringify(body) }).then((r) => (r as any).data),
  getReleases: () => request('/releases').then((r) => (r as any).data),
};
