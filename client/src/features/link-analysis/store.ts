import { create } from 'zustand';

interface TimeRange {
  start: number;
  end: number;
}

interface AnalysisState {
  timeRange: TimeRange;
  activeQuery: string | null;
  pinned: Set<string>;
  setTimeRange: (range: TimeRange) => void;
  runQuery: (query: string) => void;
  togglePinned: (id: string) => void;
  clearPinned: () => void;
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  timeRange: { start: 0, end: 100 },
  activeQuery: null,
  pinned: new Set<string>(),
  setTimeRange: (timeRange) => set({ timeRange }),
  runQuery: (activeQuery) => set({ activeQuery }),
  togglePinned: (id) =>
    set((s) => {
      const next = new Set(s.pinned);
      next.has(id) ? next.delete(id) : next.add(id);
      return { pinned: next };
    }),
  clearPinned: () => set({ pinned: new Set<string>() }),
}));
