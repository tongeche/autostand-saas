import { create } from "zustand";
import { fetchLeads } from "../services/api";

export const useLeadsStore = create((set, get) => ({
  rows: [],
  total: 0,
  loading: false,
  error: null,
  params: { search: "", limit: 50, offset: 0 },

  async load(initial = false) {
    const { params } = get();
    set({ loading: true, error: null });
    try {
      const { rows, total } = await fetchLeads(params);
      set({ rows, total, loading: false });
      if (initial && rows.length === 0) {
        console.warn("[leads] no rows for current tenant");
      }
    } catch (e) {
      console.error("[leads] load error", e);
      set({ error: e.message || String(e), loading: false });
    }
  },

  setSearch(search) { set(state => ({ params: { ...state.params, search, offset: 0 } })); },
  setPage(page) {
    const { limit } = get().params;
    const offset = Math.max(0, (page - 1) * limit);
    set(state => ({ params: { ...state.params, offset } }));
  },
}));
