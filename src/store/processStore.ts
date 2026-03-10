import { create } from 'zustand';
import { ProcessRecord, queryProcess } from '../api/process';

interface ProcessState {
  processes: ProcessRecord[];
  loading: boolean;
  fetchProcesses: (catalogId: number) => Promise<void>;
}

export const useProcessStore = create<ProcessState>((set) => ({
  processes: [],
  loading: false,
  fetchProcesses: async (catalogId) => {
    set({ loading: true });
    try {
      const res = await queryProcess(catalogId);
      if (res.isSuccess) {
        set({ processes: res.data || [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ loading: false });
    }
  },
}));
