import { create } from 'zustand';
import { type CatalogItem, queryCatalog } from '../api/catalog';

interface CatalogState {
  catalogs: CatalogItem[];
  loading: boolean;
  fetchCatalogs: () => Promise<void>;
  selectedCatalogId: number | null;
  setSelectedCatalogId: (id: number | null) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  catalogs: [],
  loading: false,
  selectedCatalogId: null,
  fetchCatalogs: async () => {
    set({ loading: true });
    try {
      const res = await queryCatalog();
      if (res.isSuccess) {
        set({ catalogs: res.data || [] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      set({ loading: false });
    }
  },
  setSelectedCatalogId: (id) => set({ selectedCatalogId: id }),
}));
