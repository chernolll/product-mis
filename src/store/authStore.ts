import { create } from 'zustand';

interface AuthState {
  apiKey: string | null;
  isAuthenticated: boolean;
  setApiKey: (key: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  apiKey: localStorage.getItem('AIRINS_RAG_KEY') || 'AIRINS-Rag-LpK8z7orhY6MEln4JtjjDW151tBqZR7kKP61BBHWtB4D48wLJ',
  isAuthenticated: !!localStorage.getItem('AIRINS_RAG_KEY'),
  setApiKey: (key) => {
    localStorage.setItem('AIRINS_RAG_KEY', key);
    set({ apiKey: key, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('AIRINS_RAG_KEY');
    set({ apiKey: null, isAuthenticated: false });
  },
}));
